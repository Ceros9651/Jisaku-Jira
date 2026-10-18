# Design

## Context

- 動機は proposal.md の「Why」を参照。要件は `specs/create-pr-command/spec.md`。
- これまでの PR（#1〜#5）はすべて `PBI-<番号>` などのブランチから `dev` へ出し、本文は「## 概要」「## 変更」「## 確認」（必要に応じて注意・マージ後の作業）で、最後に Claude Code の署名を置いている。コミットは `feat:` / `docs:` / `chore:` ＋日本語の要約に `Co-Authored-By` 行。
- CI（`.github/workflows/deploy.yml`）は `dev` への PR で `npm ci && npm run typecheck && npm test && npm run build` を走らせる。`main` は今のところ PR の対象にしていない。
- `.claude/` には、OpenSpec が生成した `commands/opsx/*.md` と、手で書いたスキル `skills/ui-review/SKILL.md`（`disable-model-invocation: true` で明示呼び出し専用）がある。
- 手元に `gh` 2.97.0 があり、`origin` は `https://github.com/Ceros9651/Jisaku-Jira.git`。

## Goals / Non-Goals

**Goals:**
- `/createPR` 1回で、前提の確認 → （必要なら）コミット → 案の了承 → push → PR 作成 まで進む。
- 本文の構成と書き方を、これまでの PR とそろえる。

**Non-Goals:**
- ブランチの作成（`dev` 上で呼ばれたら止めるだけ）。
- PR のマージ、レビュアーやラベルの設定、CI の結果待ち。
- `main` へのリリース用の PR。
- OpenSpec の change のアーカイブ（`/opsx:archive` の役割）。

## Decisions

### 置き場所: `.claude/skills/createPR/SKILL.md`
手書きのスキルとして置き、`name: createPR`・`disable-model-invocation: true` にする。`/createPR` で呼べ、モデルが会話の流れで勝手に PR を作ることを防げる。`argument-hint` で補足を渡せることを示す。
- 代替案: `.claude/commands/createPR.md`。これも `/createPR` で呼べるが、`commands/opsx/` は OpenSpec の生成物で、手書きのものは `skills/ui-review` に合わせて skills に置く方がそろう。
- `allowed-tools` は絞らない。コミット・push・PR 作成は AskUserQuestion での了承を挟む手順で守り、権限設定による自動許可はしない（了承前に push が走らないよう、ツールの許可を広げない）。

### 了承の取り方: AskUserQuestion を 2 回まで
1. 未コミットの変更があるとき: ファイルの一覧とコミットメッセージ案を本文で示し、「コミットする / 直してほしい点を伝える / やめる」を聞く。
2. PR を作る前: ベース・ヘッド・タイトル・本文の全文を本文で示し、「作成する / 直してほしい点を伝える / やめる」を聞く。
チャットでテスト等を何も確認していないときは、2 の前に「`npm run typecheck && npm test && npm run build` を実行してから作るか」を聞く（CI と同じコマンド）。
- 代替案: 1 と 2 をまとめて 1 回で聞く。コミット内容を見ないまま PR の案まで進むことになり、コミットの誤りに気づきにくいので分ける。

### 前提の確認の順と使うコマンド
1. `git rev-parse --abbrev-ref HEAD` でブランチ名（`dev` / `main` / `HEAD` なら止める）
2. `gh auth status`
3. `git fetch origin dev` のあと `git status --porcelain` と `git log origin/dev..HEAD --oneline`
4. `gh pr list --head <branch> --base dev --state open --json number,url`
変更を伴う操作より先に、読むだけのコマンドで全部確かめる。

### 本文の材料
優先順に、(1) このチャットでの実装と確認の内容、(2) `git log origin/dev..HEAD` と `git diff --stat origin/dev...HEAD`、(3) 差分に含まれる `openspec/changes/<name>/proposal.md`（あれば）、(4) `/createPR` の引数。チャットに材料が無い（別のチャットで実装した）ときは (2)(3) から作り、「## 確認」は確認していない扱いにする。

### push と作成のコマンド
- push: `git push -u origin <branch>`（`--force` 系は使わない）
- 作成: 本文をスクラッチパッドの一時ファイルに書き、`gh pr create --base dev --head <branch> --title "<タイトル>" --body-file <ファイル>`。シェルの引用で本文の `` ` `` や `$` が壊れないよう、`--body` ではなく `--body-file` を使う。

## Risks / Trade-offs

- [チャットの記憶に頼るため、別のチャットで実装したブランチでは本文が薄くなる] → コミットと差分・OpenSpec の change から補い、確認の節は「確認していない」に倒す。了承の場面でユーザーが直せる。
- [スキルの手順は文章なので、モデルが手順を飛ばしうる] → 了承が必要な操作（コミット・push・PR 作成）を手順の中で明示的に「了承後のみ」と書き、してはならない操作を一覧で書く。
- [Windows（Git Bash / PowerShell）でのコマンドの差] → 手順は Git Bash で動く `git` / `gh` のコマンドだけで書き、パイプ等の環境依存を避ける。

## Migration Plan

ファイルを1つ足すだけ。戻すときは `.claude/skills/createPR/` を消す。Claude Code は起動時にスキルを読み込むため、追加後に新しいセッションで `/createPR` が候補に出ることを確かめる。
