# Tasks

## 1. データモデルと読み込み

- [ ] 1.1 `src/backlog/model.ts` の `Pbi` に `acceptanceCriteria: string` を足し、テスト用の `src/test/backlog.ts` の `pbi()` の既定値を `''` にする。`npx tsc --noEmit` で型エラーが無いことを確かめる
- [ ] 1.2 `src/backlog/validate.ts` の `validateItems` で、`acceptanceCriteria` が無ければ `''` に補い、文字列以外なら理由付きで失敗にする。`validate.test.ts` に「項目が無い version 2 と version 1 は空で読める」「数値なら失敗する」「あれば値が保たれる」のテストを足して通す

## 2. 作成と更新

- [ ] 2.1 `src/backlog/reducer.ts` の `create` で `acceptanceCriteria: ''` を入れ、`PbiChanges` と `applyChanges` に `acceptanceCriteria` を足す。`reducer.test.ts` に「作成直後は空」「更新で受入条件だけが変わり updatedAt が進む」のテストを足して通す

## 3. コピーの Markdown

- [ ] 3.1 `src/backlog/share.ts` の `formatPbiMarkdown` で、説明の後に `### 受入条件` と本文（trim、空なら「（なし）」）を足す。`share.test.ts` の期待値を spec の例どおりに直し、受入条件が空のケースを足して通す

## 4. 詳細パネル

- [ ] 4.1 `docs/design-principles.md` を読み、`src/components/DetailPanel.tsx` の説明の下に「受入条件」のラベル付き textarea（説明と同じ class、`rows={6}`）を置く。下書きの state、`dirty` の判定、`onSave` に渡す変更に受入条件を足す。必要なら `DetailPanel.module.css` のセレクタを共用にする
- [ ] 4.2 `src/App.test.tsx` に「受入条件を入力して保存すると反映され、開き直しても残る」「受入条件だけ変えると保存ボタンが押せる」「未記入の PBI では空の欄が出る」のテストを足して `npm test` を通す
- [ ] 4.3 `npm run dev` で詳細パネルを開き、受入条件の欄が説明の下に同じ見た目で並び、新しい色・箱・アイコンが増えていないことを目で確かめる

## 5. 全体の確認

- [ ] 5.1 `npm test`・`npx tsc --noEmit`・`npm run build` がすべて通ることを確かめ、この変更より前の形式のエクスポートファイルをインポートしてエラーにならないことを開発サーバーで確かめる
