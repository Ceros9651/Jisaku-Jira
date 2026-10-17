# Proposal

## Why

公開 URL（https://ceros9651.github.io/Jisaku-Jira/）をお気に入りに追加すると、同じドメインで公開している Yarikuri のアイコンが表示される（PBI-8）。`index.html` のアイコン指定が空の `data:,` で、アプリ自身のアイコンを持っていないため、ブラウザが同じオリジンで覚えている別アプリのアイコンを使ってしまう。タブやお気に入りの並びで、チケット管理ツールだと見分けられるようにしたい。

## What Changes

- アプリ専用のアイコン（チケット管理ツールと分かる図柄）を用意し、ブラウザのタブ・お気に入り・ホーム画面への追加で表示されるようにする。
- `index.html` の空のアイコン指定（`<link rel="icon" href="data:,">`）を、`/Jisaku-Jira/` 配下に置いたアイコンファイルへの指定に置き換える。
- SVG を主にし、SVG を使わない環境向けに PNG（または ICO）と apple-touch-icon も配信する。

## Capabilities

### New Capabilities
- `app-icon`: アプリのアイコン（favicon・お気に入り・ホーム画面）が自アプリのものとして表示されること

### Modified Capabilities
（なし）

## Impact

- `index.html`（`<head>` のアイコン指定）
- 新規 `public/` ディレクトリ（Vite がビルド時に `dist/` 直下へコピーし、`base: '/Jisaku-Jira/'` 配下で配信される）
- `docs/design-principles.md`（アイコンの図柄と色のルールを追記）
- 画面のレイアウトやデータには影響しない。依存パッケージの追加なし。
