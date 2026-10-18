# Proposal

## Why

チャットでブランチ（`PBI-<番号>` など）に実装したあと、`dev` への PR を作る手順を毎回言葉で頼んでいる。未コミットの変更の扱い、push、`gh pr create` の引数、これまでの PR と同じ形の本文（概要・変更・確認）を毎回説明し直す必要があり、ベースを `main` にしてしまう・確認していないことを「確認」に書くといったぶれも起きうる。1つのコマンドで、同じ手順・同じ形の PR を作れるようにしたい。

## What Changes

- Claude Code のスラッシュコマンド `/createPR` を追加する。今のブランチから `dev` への PR を作る。
- 作る前に前提を確かめる: 今のブランチが `dev` / `main` でないこと、`gh` が使えること、`origin/dev` より先のコミットがあること、同じブランチの PR がまだ開いていないこと。満たさなければ理由を伝えて止める。
- 未コミットの変更があれば、変更の一覧とコミットメッセージの案を見せ、了承されてからコミットする。
- PR のタイトルと本文を、チャットでの実装内容・コミット・差分・OpenSpec の change から作り、作る前にユーザーに見せて了承を得る。本文はこれまでの PR（#1〜#5）と同じ構成にし、「確認」にはこのチャットで実際に確かめたことだけを書く。
- 了承されたら push して `gh pr create --base dev` で PR を作り、URL を伝える。force push・マージ・フックの省略はしない。

## Capabilities

### New Capabilities
- `create-pr-command`: `/createPR` で、チャットで実装したブランチから `dev` への PR を確認つきで作ること

### Modified Capabilities
（なし）

## Impact

- 新規 `.claude/skills/createPR/SKILL.md`（`/createPR` として呼ぶ。モデルが自分から呼ばないようにする）
- アプリのコード・テスト・ビルド・CI（`.github/workflows/deploy.yml`）には影響しない。依存パッケージの追加なし。
- 前提として、手元に `gh`（GitHub CLI）があり、`gh auth login` 済みであること。
