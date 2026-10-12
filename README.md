# Jisaku-Jira

個人開発のスクラムで使う、プロダクトバックログ管理ツール。Jira のバックログ画面の要点だけを持つ。

公開先: <https://ceros9651.github.io/Jisaku-Jira/>

- PBI には追加した順に `PBI-1`, `PBI-2`, … の ID が付く。削除した番号は再利用しない（欠番になる）。
- 一覧はドラッグ、またはキーボード（持ち手にフォーカスしてスペースで掴み、上下の矢印で移動、スペースで置く）で並べ替えられる。並べ替えても ID は変わらない。
- PBI はステータス（To Do / In Progress / Done）とストーリーポイント（任意、0 以上の整数）を持つ。
- PBI を選ぶと右側に詳細が開き、URL が `#PBI-3` のようになる。このリンクで直接開ける。

## データの保存とバックアップ

データはサーバーではなく、**使っているブラウザの localStorage** に保存される。

- ブラウザのサイトデータを消すと、バックログも消える。
- 別のブラウザや端末とは共有されない。
- ヘッダーの「エクスポート」で JSON ファイルに書き出し、定期的にバックアップすること。
- 「インポート」でそのファイルを読み込むと、現在のバックログを置き換える（確認あり）。端末間の移行もこの方法で行う。

## 開発

Node.js 24 以上。

```bash
npm install
npm run dev        # http://localhost:5173/Jisaku-Jira/ で起動
npm test           # テスト（Vitest）
npm run typecheck  # 型チェック
npm run build      # dist/ にビルド
npm run preview    # ビルド結果を http://localhost:4173/Jisaku-Jira/ で確認
```

UI を変更するときは [docs/design-principles.md](docs/design-principles.md) に従う。

## GitHub Pages への公開

`dev` に push すると、GitHub Actions（[.github/workflows/deploy.yml](.github/workflows/deploy.yml)）が型チェック・テスト・ビルドを行い、GitHub Pages に公開する。`dev` 向けの PR では、公開せずにチェックとビルドだけを行う。

初回だけ、リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にする。

公開先は <https://ceros9651.github.io/Jisaku-Jira/>。リポジトリ名を変えたり独自ドメインを使ったりする場合は、[vite.config.ts](vite.config.ts) の `base` を合わせて変える。
