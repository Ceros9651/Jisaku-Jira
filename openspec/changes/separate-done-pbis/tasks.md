# Tasks

## 1. 並べ替えの移動先を番号で渡す

- [ ] 1.1 src/components/BacklogTable.tsx の `onMove` を `(number, overNumber) => void` に変え、`handleDragEnd` では `over.id` の番号をそのまま渡す。src/App.tsx では `project.items` から `overNumber` の位置を求めて `move` の `toIndex` にし、見つからなければ何もしない。`npm run typecheck` が通ることを確認する
- [ ] 1.2 src/backlog/reducer.test.ts に、全体 `[1, 2(Done), 3]` で「3 を 1 の位置へ」→ `[3, 1, 2]`、「1 を 3 の位置へ」→ `[2, 3, 1]` になるテストを足し（over の全体の位置を `toIndex` に渡す形で）、`npm test` で通ることを確認する

## 2. 並べ替えを持たない表

- [ ] 2.1 src/components/BacklogTable.tsx に `sortable?: boolean`（既定 true）と、表の名前（`aria-label` または `aria-labelledby`）を受け取る props を足す。行の中身を共通にし、`sortable` のときは `useSortable` を使う行、そうでないときは持ち手の無い行（持ち手の列は空のセル）を描く。`sortable={false}` では `DndContext` / `SortableContext` で包まない。既存の `npm test` が通ることを確認する

## 3. 一覧を未完了と Done エリアに分ける

- [ ] 3.1 src/App.test.tsx の `rowTexts()` を、名前で指定した表の中の行だけを返す形に変える（既定は未完了の一覧「未完了の PBI」）。既存のテストが変わらず通ることを確認する
- [ ] 3.2 src/App.tsx で `items` を未完了（To Do・In Progress）と Done に分け、未完了は `aria-label="未完了の PBI"` の並べ替えできる表に、Done は 3.3 の Done エリアに渡す。件数と SP 合計は未完了だけで数え、ステータス別 SP は全体のまま、プロジェクト削除の確認文の件数も全体のままにする。src/App.test.tsx の「見出しにステータス別の SP を出す」の期待値を「3 件7 pt」に直し、spec の「件数と合計」（Done 2 を含む4件で 3 件・8 pt）のテストを足して、`npm test` で通ることを確認する
- [ ] 3.3 src/App.tsx に、Done の PBI が1件以上あるときだけ、未完了の一覧の下に `<section aria-labelledby="done-heading">` の Done エリアを出す。見出しの `<h2 id="done-heading">Done</h2>` の横に、Done の件数と SP 合計（`data-testid="done-summary"`、「◯ 件」「◯ pt」）を並べ、その下に `sortable={false}` の表（名前は見出しを参照）を置く。src/App.test.tsx に、spec の「Done エリアの見出し」「Done の PBI が無いとき」「Done エリアから詳細を開く」のテストを足して通ることを確認する
- [ ] 3.4 未完了の PBI が無いとき（すべて Done）は、未完了の一覧の位置に「未完了の PBI はありません。」を既存の `.empty` の見た目で出し、作成欄と Done エリアはそのまま表示する。PBI が1件も無いときは今までどおりの空状態だけを出す。src/App.test.tsx に、spec の「未完了の PBI がないとき」「PBI がないとき」（Done エリアが無いこと）のテストを足して通ることを確認する
- [ ] 3.5 src/App.test.tsx に、spec の「Done にすると Done エリアに移る」（一覧から）、「詳細から Done にしても移る」（パネルは開いたまま）、「Done から戻すと元の位置に戻る」（`1, 2(Done), 3` で 2 を To Do → 未完了の一覧が `1, 2, 3`）のテストを足し、保存された並び順が変わっていないことも確かめて通ることを確認する

## 4. Done エリアの見た目と方針

- [ ] 4.1 src/App.module.css に Done エリアのスタイルを足す。未完了の一覧との間は `--space-6`、見出しの行は `.titleRow` と同じ並びで、`h2` は 14px/700・本文色、集計は `.summary` と同じ（gray-700・等幅数字・「·」区切り）。箱・角丸・影・アイコンは付けない。dev サーバー（`.claude/skills/ui-review/project.md` の起動コマンド）で desktop 1440×900 と mobile 390×844 を開き、Done の行が未完了の一覧と同じ列幅で並び、持ち手が無く、横にはみ出さないことを確認する
- [ ] 4.2 docs/design-principles.md の「余白とレイアウト」に、「Done の PBI は未完了の一覧の下の Done エリアにまとめ、箱や折りたたみの矢印を使わず、小見出し（14px）と集計の行、同じ罫線の表で示す。見出しの件数・合計は未完了だけで数える。（separate-done-pbis）」を追記する

## 5. 確認

- [ ] 5.1 `npm test` と `npm run typecheck` が通ることを確認する
- [ ] 5.2 dev サーバーで、未完了の一覧の行をキーボード（スペース→下矢印→スペース）とドラッグで並べ替え、間に Done の PBI が挟まっていても見えている順序どおりに動くこと、再読み込み後も保たれることを確認する
