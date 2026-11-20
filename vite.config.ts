import { defineConfig, Plugin } from 'vite';

// GitHub Pages は HTTP ヘッダーを設定できないため、本番ビルドの HTML にだけ CSP を <meta> で埋め込む
// （開発サーバーは HMR 用の WebSocket 等が必要なので対象外）
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "manifest-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function cspMetaPlugin(): Plugin {
  return {
    name: 'nyarmada-csp-meta',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n    <meta name="referrer" content="no-referrer" />`
      );
    },
  };
}

export default defineConfig({
  // GitHub Pages の /<repo>/ 配下でも動くよう相対パスで出力
  base: './',
  plugins: [cspMetaPlugin()],
  build: {
    sourcemap: false,
  },
});
