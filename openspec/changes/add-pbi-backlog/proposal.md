# Proposal

## Why

個人開発でスクラムを回すとき、PBI（プロダクトバックログアイテム）を管理する場所がない。Jira は個人で使うには重く、メモやスプレッドシートでは「PBI-12」のような安定した番号で呼べない・優先順位を並べ替えにくい。Jira のバックログ画面の要点だけを持つ、自分用の軽いツールを作る。

## What Changes

- 新規の Web アプリ（静的サイト、GitHub Pages で公開）を作る。リポジトリにはまだアプリのコードがないため、プロジェクトの土台から作る。
- バックログ画面を作る。PBI の追加・一覧・詳細表示・編集・削除ができる。
- PBI には追加順に `PBI-1`, `PBI-2`, … の ID を自動で付ける。ID は一度付けたら変わらず、削除しても番号は再利用しない（欠番になる）。
- バックログの並び順は手動で変えられる（初期は追加順で末尾に追加）。並び順を変えても ID は変わらない。
- PBI はステータス（To Do / In Progress / Done）とストーリーポイント（任意）を持つ。
- データはブラウザの localStorage に保存し、リロードしても残る。バックアップと端末間の移行のために JSON ファイルへのエクスポートとインポートを用意する。

スコープ外（後続の変更で扱う）: スプリント、カンバンボード、複数プロジェクト、ユーザー・認証、サーバー側への保存。

## Capabilities

### New Capabilities
- `pbi-backlog`: PBI の作成・一覧・編集・削除、`PBI-<番号>` の採番規則、手動並べ替え、ステータスとストーリーポイント
- `backlog-storage`: バックログの永続化（localStorage）と JSON エクスポート／インポート

### Modified Capabilities
（なし）

## Impact

- 新規コード: フロントエンドアプリ一式（ビルド設定、画面、データ層）。
- 新規依存: Vite / React / TypeScript、テストランナー（Vitest）、並べ替え用ライブラリ。
- 新規の配信設定: GitHub Actions による GitHub Pages へのデプロイ。
- UI は `docs/design-principles.md`（まだ存在しないため、テンプレートから作る）と `.claude/skills/ui-review/anti-patterns.md` に従う。
