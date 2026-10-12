# /ui-review のプロジェクト設定

<!-- status: configured -->

このファイルは `/ui-review` を初めて実行したときに、リポジトリを調べて自動で埋められる。
手で直してもよい。`status` が `unconfigured` のあいだは、/ui-review は最初にこのファイルの設定を行う。

## アプリの概要

- 何のアプリか: 個人開発のスクラムで使う PBI（プロダクトバックログアイテム）管理ツール。Jira のバックログ画面が理想像
- 主な利用者と使い方: 開発者本人がデスクトップのブラウザで開き、PBI を追加・並べ替え・ステータス更新する。GitHub Pages で公開
- 主な対象の画面幅: デスクトップ中心（スマホでも崩れないこと）

## 技術スタック

- フレームワーク: React 19 + Vite 8 + TypeScript
- ルーター: なし（1画面）。選択中の PBI だけ URL ハッシュ（`#PBI-3`）で表す。処理は src/useSelectedPbi.ts
- スタイリング: CSS Modules（`*.module.css`）＋グローバル CSS（src/styles/global.css）
- デザイントークンの場所: src/styles/tokens.css の :root
- アイコン: なし（並べ替えの持ち手と閉じるボタンだけ、インライン SVG）
- ダークモード: なし

## dev サーバー

- 起動コマンド: `node ./node_modules/vite/bin/vite.js --port 5287 --strictPort`（この端末では 5173 を別プロジェクトが使っているため、ポートを固定する）
- ベースURL: http://localhost:5287/Jisaku-Jira/
- 起動確認: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5287/Jisaku-Jira/` が 200
- ハッシュルーター: いいえ（ただし詳細パネルは `#PBI-<番号>` 付きの URL で開ける。ハッシュだけ変えた移動では再読み込みにならないので、`?reload=1#PBI-1` のようにクエリを付けて再読み込みする）

## ビューポート

撮影するビューポート。1つ目を主とする。

| 名前    | 幅×高さ   | 用途                     |
| ------- | --------- | ------------------------ |
| desktop | 1440×900  | 主                       |
| laptop  | 1280×720  | 詳細パネルを開いたときの幅の確認 |
| mobile  | 390×844   | はみ出し確認             |

## 画面一覧

| 画面名（引数で受け付ける名前） | URL | 主なファイル | spec の capability（OpenSpec を使う場合） | change 名 |
| ------------------------------ | --- | ------------ | ----------------------------------------- | --------- |
| バックログ / backlog | http://localhost:5287/Jisaku-Jira/ （詳細パネルを開いた状態は `#PBI-1`） | src/App.tsx, src/components/BacklogTable.tsx, src/components/DetailPanel.tsx, src/components/CreatePbiForm.tsx | pbi-backlog | ui-refine-backlog |

- 動的なパラメータが要る画面は、下の「データの準備」で入る固定の ID を使う（シードには PBI-1, 3, 4, 6〜14 がある）。

## データの準備

撮影用のブラウザ（Playwright）は利用者の端末とは別で、データが空のことが多い。空のままでは空状態しか撮れない画面がある場合、撮影前にデータを用意する方法をここに書く。

- 方法: ブラウザで実行するスクリプト（`.claude/skills/ui-review/fixtures/seed-backlog.js`）
- 手順: ベースURLを開く → スクリプトの中身を `browser_evaluate` の function として実行 → ページを再読み込み。12件（ステータス混在、SP 未設定あり、長いタイトルあり、欠番あり）が入る。空状態を見るときは `localStorage.clear()` してから再読み込み
- 注意: Playwright MCP は `--isolated` で起動しており、撮影用ブラウザの中だけで完結する。利用者のブラウザのデータには触れない。

## 変更の起票先

- OpenSpec: 使う
  - CLI 1.13.2。spec 差分は必須（`skip_specs` は使っていない。差分なしだと `openspec validate --strict` が落ちる）。見た目の要件は capability `pbi-backlog` に `## ADDED Requirements` で足す
  - 書式の参考: openspec/changes/add-pbi-backlog/（アーカイブ後は openspec/changes/archive/ 配下）
- テスト・lint のコマンド: `npm test` / `npm run typecheck`（lint は未導入）
