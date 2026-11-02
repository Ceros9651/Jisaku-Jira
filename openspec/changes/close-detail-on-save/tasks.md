# Tasks

## 1. 保存したら詳細パネルを閉じる

- [x] 1.1 src/components/DetailPanel.tsx の `save()` で、入力の検査を通って `onSave` を呼んだあとに `onClose()` を呼ぶ。検査に失敗したときは今までどおり何もせず戻る。閉じるので要らなくなる `saved` の状態、フォームの `onChange={() => setSaved(false)}`、保存後の `setTitle` / `setStoryPoints`、「保存しました」の `role="status"` を削除し、src/components/DetailPanel.module.css の `.savedNote` も削除する。`npm run typecheck` が通ることを確認する
- [x] 1.2 src/App.test.tsx に、`PBI-2` の説明を変えて保存ボタンを押すと保存されて `complementary` が消え、`window.location.hash` が空になるテストと、タイトル欄で Enter を押して保存しても `complementary` が消えるテストを足す。「%s のときはエラーを表示して保存しない」のテストに、保存を押したあとも `complementary` が表示されたままであることの確認を足す。ステータスを変えてもパネルが開いたままであることは既存のテスト（詳細から Done にしても移る）で確かめられていることを確認する
- [x] 1.3 src/App.test.tsx の「受入条件を入力して保存すると反映され、開き直しても残る」で、保存のあとに押している「詳細を閉じる」を削除し（保存でもう閉じているため）、`b` の行を押して開き直す流れにする。保存後にパネルの中を見ている既存のテストがほかに無いかを `grep -n "保存' }))" src/App.test.tsx` の前後で確かめ、あれば直す。`npm test` がすべて通ることを確認する

## 2. 実画面での確認

- [x] 2.1 `npm run dev` で desktop 1440×900 と mobile 390×844 を開き、詳細パネルで説明を書いて保存するとパネルが閉じて一覧が残りの幅いっぱいに戻ること、URL の `#1/PBI-n` が消えること、ストーリーポイントに -1 を入れて保存するとパネルが開いたままエラーが出ること、ステータスの変更ではパネルが閉じないことを確認する
