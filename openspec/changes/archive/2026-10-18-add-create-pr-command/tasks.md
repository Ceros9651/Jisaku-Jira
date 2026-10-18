# Tasks

## 1. スキルの作成

- [x] 1.1 `.claude/skills/createPR/SKILL.md` を作り、frontmatter に `name: createPR`・`description`（明示呼び出し専用であること）・`argument-hint: [補足]`・`disable-model-invocation: true` を書く。新しいセッションで `/createPR` が候補に出ることを確認する
- [x] 1.2 手順「前提の確認」を書く（ブランチ名が `dev` / `main` / `HEAD` なら止める、`gh auth status`、`git fetch origin dev`、`git status --porcelain`、`git log origin/dev..HEAD`、`gh pr list --head <branch> --base dev --state open`）。読むだけのコマンドで先に全部確かめ、満たさないときの伝え方（次にすべきこと）を spec の各シナリオどおりに書いたことを、spec の「作る前の前提の確認」と突き合わせて確認する
- [x] 1.3 手順「未コミットの変更のコミット」を書く（ファイルの一覧とメッセージ案の提示、AskUserQuestion で「コミットする / 直してほしい点を伝える / やめる」、`.env*` を対象から外して知らせる、メッセージは接頭辞＋日本語の要約＋ `Co-Authored-By` 行）。spec の「未コミットの変更のコミット」の 3 シナリオが手順で満たされることを突き合わせて確認する
- [x] 1.4 手順「タイトルと本文の案」を書く（材料の優先順、`PBI-<番号>` のタイトル、「## 概要」「## 変更」「## 確認」の構成と PBI の公開 URL、署名行、確認していないことを通ったと書かない、何も確認していなければ `npm run typecheck && npm test && npm run build` を実行するか聞く）。本文の見本として PR #5 の構成を参考に書いたことを確認する
- [x] 1.5 手順「了承と作成」を書く（ベース・ヘッド・タイトル・本文の全文を示し AskUserQuestion で「作成する / 直してほしい点を伝える / やめる」、了承後のみ `git push -u origin <branch>` と `gh pr create --base dev --head <branch> --title ... --body-file <スクラッチパッドの一時ファイル>`、URL を伝える）と、「してはならない操作」（ベースを dev 以外にしない、force push・マージ・`--no-verify`・他ブランチへの push をしない、失敗時はエラーを伝えて止まる）の一覧を書く。spec の「作る前の了承」「してはならない操作」と突き合わせて確認する
- [x] 1.6 `README.md` の開発の節に、`/createPR` で今のブランチから `dev` への PR を作れること（前提: `gh auth login` 済み）を 1〜2 行で追記する

## 2. 動作の確認

- [x] 2.1 `dev` ブランチで `/createPR` を呼び、何も変更されずに「作業用のブランチを切ってから」と伝えて止まることを確認する
- [x] 2.2 この change を実装したブランチ（例: `PBI-<番号>`）で、未コミットの変更を残したまま `/createPR` を呼ぶ。コミットの案 → 了承 → タイトルと本文の案（構成・PBI の URL・確認の節が spec どおり）→ 「作成する」で push と PR 作成まで進み、GitHub 上で PR のベースが `dev` になっていることを確認する（この PR をそのまま本 change の PR にしてよい）
- [x] 2.3 PR を作った直後にもう一度 `/createPR` を呼び、新しい PR を作らずに既存の PR の URL が伝えられることを確認する
