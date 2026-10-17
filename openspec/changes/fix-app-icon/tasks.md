# Tasks

## 1. アイコンの作成

- [x] 1.1 `public/icon.svg` を作る（アクセント色 `#1f5fbf` の地に白い縦の札を 3 列、高さを変えて並べる。グラデーション・影なし）。ブラウザで 16px と 180px に縮小・拡大して表示し、16px でも列に札が並んだ形に読めることを確認する
- [x] 1.2 `icon.svg` から `public/favicon-32.png`（32×32）と `public/apple-touch-icon.png`（180×180、地は四角いまま）を書き出す。依存パッケージを追加せずに書き出し、画像のサイズが指定どおりであることを確認する
- [x] 1.3 `docs/design-principles.md` の「アイコンと文字」に、アプリのアイコンの図柄と色（アクセント色と白の 2 色、3 列の札）のルールを由来の change 名（fix-app-icon）付きで追記する

## 2. ページからの指定

- [x] 2.1 `index.html` の `<link rel="icon" href="data:," />` を、`%BASE_URL%icon.svg`（SVG）、`%BASE_URL%favicon-32.png`（PNG 32×32）、`%BASE_URL%apple-touch-icon.png`（apple-touch-icon）の 3 つの指定に置き換える。`npm run build` 後の `dist/index.html` で各 `href` が `/Jisaku-Jira/` で始まり、`dist/` 直下に 3 ファイルがあることを確認する
- [x] 2.2 `index.html` のアイコン指定を確かめるテストを追加する（`data:,` が無いこと、3 つの `<link>` がそれぞれ `%BASE_URL%` 付きで `public/` に実在するファイルを指すこと）。`npm test` が通ることを確認する

## 3. 公開後の確認

- [x] 3.1 `npm run typecheck && npm test && npm run build` が通ることを確認し、`npm run preview` で `/Jisaku-Jira/` と `/Jisaku-Jira/#PBI-8` を開いてタブにアイコンが出ることを確認する
- [ ] 3.2 デプロイ後、https://ceros9651.github.io/Jisaku-Jira/ の各アイコン URL が HTTP 200 を返すこと、既存のお気に入りを削除して追加し直すと新しいアイコンが表示され Yarikuri のアイコンが出ないことを確認する
