# 🐾 NYARMADA（ニャルマダ）

猫たちが操縦するポップSF宇宙戦艦の **クラフト＆オート物理バトル** Webゲーム。

▶ **プレイ:** https://u-tajima.github.io/nyarmada/ （スマホは横画面推奨）

## 遊び方
- ガレージで艦体・武装・推進器・補助パーツを組み合わせて戦艦を設計
- 出撃するとバトルは全自動。重心・向き・パーツ相性がすべて
- 各ステージのボスは「まだ持っていないパーツ」を1つ装備して登場。対策を練って撃破すると、そのパーツを奪取できる（全10ステージ＋エンドレス杯）

## 開発
```bash
npm install
npm run dev      # 開発サーバー
npm run build    # dist/ に本番ビルド
npm run serve    # dist/ をセキュアな簡易サーバーで配信（既定 127.0.0.1:8080）
```

技術: TypeScript / Vite / Matter.js / Canvas 2D / Web Audio API
