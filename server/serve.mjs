// NYARMADA 公開用・簡易静的サーバー（外部依存なし / Node.js 標準モジュールのみ）
//
// セキュリティ方針
//  - 起動時に dist/ の中身だけをメモリに読み込み、そのホワイトリスト以外は一切返さない
//    → リクエストのたびにファイルシステムを触らないので、パストラバーサルが原理的に起きない
//  - GET / HEAD のみ受け付け、それ以外は 405
//  - CSP をはじめとするセキュリティヘッダーを全レスポンスに付与
//  - IP ごとの簡易レート制限、タイムアウト、同時接続数の上限で負荷攻撃を軽減
//  - Server ヘッダーやスタックトレースなど内部情報は出さない
//
// 使い方:  npm run build  →  npm run serve
//   HOST (既定 127.0.0.1) / PORT (既定 8080) を環境変数で変更できます。

import { createServer } from 'node:http';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 8080);
const TRUST_PROXY = process.env.TRUST_PROXY === '1'; // トンネル/リバースプロキシ経由時のみ X-Forwarded-For を信用

const DIST_DIR = fileURLToPath(new URL('../dist/', import.meta.url));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
};

// ---------- 1. 公開ファイルをホワイトリストとしてメモリに読み込む ----------
/** @type {Map<string, { body: Buffer; gzip: Buffer | null; type: string; cache: string; etag: string }>} */
const FILES = new Map();

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue; // ドットファイルは公開しない
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full);
      continue;
    }
    const ext = extname(name).toLowerCase();
    const type = MIME[ext];
    if (!type) continue; // 未知の拡張子（.map など）は公開しない
    const urlPath = '/' + relative(DIST_DIR, full).split(sep).join('/');
    const body = readFileSync(full);
    const compressible = /^(text\/|application\/(json|manifest)|image\/svg)/.test(type);
    FILES.set(urlPath, {
      body,
      gzip: compressible && body.length > 512 ? gzipSync(body, { level: 9 }) : null,
      type,
      // ハッシュ付きの assets は長期キャッシュ、それ以外は毎回再検証
      cache: urlPath.startsWith('/assets/')
        ? 'public, max-age=31536000, immutable'
        : 'no-cache',
      etag: `"${body.length.toString(16)}-${st.mtimeMs.toString(16)}"`,
    });
  }
}

try {
  walk(DIST_DIR);
} catch {
  console.error('dist/ が見つかりません。先に `npm run build` を実行してください。');
  process.exit(1);
}
if (!FILES.has('/index.html')) {
  console.error('dist/index.html がありません。先に `npm run build` を実行してください。');
  process.exit(1);
}
FILES.set('/', FILES.get('/index.html'));

// ---------- 2. セキュリティヘッダー ----------
const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    // ガレージUIが style 属性を使うため style は inline を許可（スクリプトは不可）
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    "manifest-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), interest-cohort=()',
};

// ---------- 3. 簡易レート制限（IP ごとに 1 分あたり 240 リクエスト） ----------
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 240;
const hits = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of hits) if (now - rec.start > RATE_WINDOW_MS) hits.delete(ip);
}, RATE_WINDOW_MS).unref();

function clientIp(req) {
  if (TRUST_PROXY) {
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff.length < 200) return xff.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now - rec.start > RATE_WINDOW_MS) {
    hits.set(ip, { start: now, count: 1 });
    return false;
  }
  rec.count++;
  return rec.count > RATE_LIMIT;
}

// ---------- 4. リクエスト処理 ----------
function sendPlain(res, status, text, extra = {}) {
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extra,
  });
  res.end(text);
}

const server = createServer((req, res) => {
  try {
    const ip = clientIp(req);
    if (rateLimited(ip)) {
      sendPlain(res, 429, 'Too Many Requests', { 'Retry-After': '60' });
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendPlain(res, 405, 'Method Not Allowed', { Allow: 'GET, HEAD' });
      return;
    }

    const rawUrl = req.url || '/';
    if (rawUrl.length > 512 || rawUrl.includes('\0')) {
      sendPlain(res, 400, 'Bad Request');
      return;
    }

    // クエリ文字列は無視し、パスだけでホワイトリストを引く（デコードも不要）
    const pathname = rawUrl.split('?')[0].split('#')[0];
    const file = FILES.get(pathname);
    if (!file) {
      sendPlain(res, 404, 'Not Found');
      return;
    }

    const headers = {
      ...SECURITY_HEADERS,
      'Content-Type': file.type,
      'Cache-Control': file.cache,
      ETag: file.etag,
      Vary: 'Accept-Encoding',
    };

    if (req.headers['if-none-match'] === file.etag) {
      res.writeHead(304, headers);
      res.end();
      return;
    }

    const acceptGzip = /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''));
    const body = acceptGzip && file.gzip ? file.gzip : file.body;
    if (body === file.gzip) headers['Content-Encoding'] = 'gzip';
    headers['Content-Length'] = String(body.length);

    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    // 内部エラーの詳細は外に出さない
    if (!res.headersSent) sendPlain(res, 500, 'Internal Server Error');
    else res.destroy();
  }
});

// スローロリス等への対策
server.headersTimeout = 10_000;
server.requestTimeout = 15_000;
server.keepAliveTimeout = 5_000;
server.maxHeadersCount = 50;
server.maxConnections = 200;
server.on('clientError', (_err, socket) => {
  if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
  else socket.destroy();
});

server.listen(PORT, HOST, () => {
  console.log(`NYARMADA server: http://${HOST}:${PORT}/  (${FILES.size - 1} files)`);
  if (HOST === '0.0.0.0' || HOST === '::') {
    console.log('⚠ 全ネットワークインターフェースで待ち受け中です（LAN内の他端末からアクセス可能）');
  }
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => server.close(() => process.exit(0)));
}
