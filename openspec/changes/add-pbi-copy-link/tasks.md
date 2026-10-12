# Tasks

## 1. PBI のリンクを仕様として固定する

- [ ] 1.1 App.test.tsx に、`PBI-9` が無いバックログで `/#PBI-9` を開くと一覧だけが表示され、詳細パネルが開かないテストを足す（`/#PBI-3` で開くテストは既にある）。実装は変えずに `npm test` が通ることを確認する

## 2. リンクと Markdown を作る関数

- [ ] 2.1 src/backlog/share.ts に `pbiUrl(number, location)` を作る。`origin + pathname + '#PBI-<番号>'` を返し、クエリと既存のハッシュは捨てる。src/backlog/share.test.ts で、`http://localhost:5173/Jisaku-Jira/?reload=1#PBI-2` から `PBI-5` のリンクが `http://localhost:5173/Jisaku-Jira/#PBI-5` になることを確かめて通す
- [ ] 2.2 同じファイルに `formatPbiMarkdown(pbi, url)` を作る。spec「コピーする Markdown の形」の例（PBI-3、In Progress、SP 5、説明あり）と完全に一致する文字列になるテストと、SP 未設定で「未設定」、説明が空（空白だけを含む）で「（なし）」になるテスト、複数行の説明がそのまま入るテストを share.test.ts に足して通す

## 3. 一覧のコピーボタン

- [ ] 3.1 src/components/BacklogTable.tsx の SP 列の後ろに `copyCol` の列を足す。見出しセルは `visually-hidden` の「コピー」。各行に「コピー」と表示し `aria-label="PBI-<番号> をコピー"` を持つボタンを置き、押すと `formatPbiMarkdown(pbi, pbiUrl(pbi.number, window.location))` を `navigator.clipboard.writeText` に渡す。`navigator.clipboard` が無ければ失敗として扱う。App.test.tsx に、`navigator.clipboard.writeText` を差し替えて `PBI-3 をコピー` を押すと spec の形の Markdown が渡されること、詳細パネルが開かず `location.hash` が変わらないことのテストを足して通す。既存テスト（`cell` の `[1]` と `[4]`）が変わらず通ることも確認する
- [ ] 3.2 Row に `idle / copied / failed` の状態を持たせ、成功で「コピー済み」、失敗で「コピー失敗」に変え、2000ms 後に「コピー」へ戻す。連打とアンマウントでタイマーをクリアする。BacklogTable に `role="status"` の `visually-hidden` 要素を1つ置き、「PBI-3 をコピーしました」「PBI-3 をコピーできませんでした」を入れる。App.test.tsx に、成功時に「コピー済み」と status の文が出ること、`writeText` が reject したとき「コピー失敗」になりバックログが変わらないこと、fake timer で 2 秒後に「コピー」に戻ることのテストを足して通す
- [ ] 3.3 src/components/BacklogTable.module.css に `.copyCol` と `.copy` を足す。列幅は「コピー済み」が収まる 72px 前後（560px 以下は 56px 前後）、ボタン幅は固定。枠・背景なしの 12px 文字で、普段は `--text-muted`、`.row:hover` と `:focus-visible` で `--text` と下線にする。色は赤やアクセント色を使わない。`npm run dev` で desktop 1440×900 と mobile 390×844 を開き、文字が変わっても列がずれないこと、mobile でタイトル列が読めることを確認する
- [ ] 3.4 docs/design-principles.md の「アイコンと文字」に「行の操作（コピーなど）は文字のボタンにし、普段は muted、行 hover・focus で本文色にする。（add-pbi-copy-link）」を追記する。README の機能一覧に「一覧の右端の『コピー』で、PBI のリンクと内容を Markdown でコピーできる（AI のチャットに貼る用途）。リンクはデータのあるブラウザでだけ開ける。」を足す

## 4. 確認

- [ ] 4.1 `npm test`、`npm run typecheck`、`npm run build` が通ることを確認する。`npm run dev` で実際にコピーし、テキストエディタに貼った内容が spec の形になっていること、貼ったリンクを同じブラウザの新しいタブで開くと詳細パネルが開くことを確認する
