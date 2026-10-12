# Jisaku-Jira

## 開発環境のセットアップ

Claude Code で開発する前提の構成です。OpenSpec のコマンドと UI レビュー用のエージェント（[de-ai-ui](https://github.com/Ceros9651/de-ai-ui)）はリポジトリに含まれているので、clone すればそのまま使えます。

### 必要なもの

- [Claude Code](https://claude.com/claude-code)
- Node.js（Playwright MCP を `npx` で起動するために使います。v24 で動作確認済み）
- [OpenSpec](https://github.com/Fission-AI/OpenSpec) CLI（1.13.2 で動作確認済み）

  ```sh
  npm install -g @fission-ai/openspec
  ```

### 手順

1. リポジトリを clone します。

   ```sh
   git clone https://github.com/Ceros9651/Jisaku-Jira.git
   cd Jisaku-Jira
   ```

2. このディレクトリで Claude Code を起動します。
3. `.mcp.json` の `playwright` サーバーを使うか聞かれたら、許可します。初回はブラウザのダウンロードに少し時間がかかることがあります。
4. `/opsx:explore` や `/ui-review` が補完候補に出れば、準備は完了です。

### 含まれているもの

| パス | 内容 |
| --- | --- |
| `openspec/` | OpenSpec の仕様（`specs/`）と変更計画（`changes/`） |
| `.claude/commands/opsx/`、`.claude/skills/openspec-*` | OpenSpec 用のコマンドとスキル（`/opsx:propose`、`/opsx:apply` など） |
| `.claude/agents/ui-reviewer.md`、`.claude/skills/ui-review/` | de-ai-ui の UI レビュー（`/ui-review`） |
| `.mcp.json` | `/ui-review` が画面を撮影するための Playwright MCP の設定 |
| `.agents/skills/grill-me/`、`skills-lock.json` | 設計を質問で詰める grill-me スキル（取得元は `skills-lock.json` に記録） |
| `CLAUDE.md` | Claude Code への指示。画面を作るときは `docs/design-principles.md` に従わせる |

`.ui-review-tmp/` は `/ui-review` が撮ったスクショの一時置き場なので、`.gitignore` でコミット対象から外しています。

### 使い方

```text
/opsx:propose <やりたいこと>        変更計画（proposal・design・tasks）を作る
/opsx:apply                        変更計画のタスクを実装する
/ui-review <画面名>                 画面の「AIっぽさ」をレビューして修正案を相談する
/ui-review --verify <change名>      実装後に Before/After のスクショで確かめる
```

`/ui-review` を初めて実行すると、画面一覧などのプロジェクト設定（`.claude/skills/ui-review/project.md`）と参考アプリ（`references.md`）の登録を先に行います。詳しくは [de-ai-ui の README](https://github.com/Ceros9651/de-ai-ui) を見てください。

### de-ai-ui を更新するとき

de-ai-ui のリポジトリは、このリポジトリの中ではなく一時フォルダに clone し、`.claude/` の中身だけをコピーします。リポジトリごと中に置くと、Claude Code はエージェントやスキルを読み込みません。

```sh
git clone --depth 1 https://github.com/Ceros9651/de-ai-ui.git /tmp/de-ai-ui
cp -r /tmp/de-ai-ui/.claude/. ./.claude/
```

コピーすると `.claude/skills/ui-review/` の中にある同じ名前のファイルは上書きされます。`project.md` と `references.md` を編集している場合は、先に退避してください。
