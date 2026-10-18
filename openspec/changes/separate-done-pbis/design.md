# Design

## Context

- PBI の並び順は `Project.items` の配列の順序そのもので、ステータスはその要素の1項目にすぎない（`src/backlog/model.ts`）。
- `BacklogTable` は受け取った `items` を全部1つの `SortableContext` に入れて描く。ドラッグの終わりには `over` の PBI の位置を `items.findIndex` で求め、その添字をそのまま `move` に渡している。`move`（`src/backlog/reducer.ts`）はプロジェクトの全体の配列の添字として受け取って `splice` で動かす。
- 見出しの件数・合計・ステータス別 SP は `App.tsx` で `project.items` 全体から計算している。
- テストの `rowTexts()`（`src/App.test.tsx`）は画面中のすべての `row` を拾っている。表が2つになると Done の行と2つ目の見出しの行も混ざる。

## Goals / Non-Goals

**Goals:**
- データ形式・保存・共有・インポート／エクスポートを変えずに、表示だけで2つの一覧に分ける。
- 未完了の一覧で並べ替えたとき、Done の PBI の位置に関係なく、見えている順序どおりに動く。

**Non-Goals:**
- Done エリアの折りたたみ、完了日時の記録、完了順での並び替え（ユーザー確認のうえ対象外）。
- Done の PBI を自動で配列の末尾へ移すような、保存される並び順の書き換え。

## Decisions

### 1. 並び順は配列のまま、表示で `status` により絞り込む

`App.tsx` で `items` を `active = items.filter(p => p.status !== 'done')` と `done = items.filter(p => p.status === 'done')` に分け、それぞれ表に渡す。Done に変えた PBI は配列の同じ位置に残るので、戻すと前後関係が元どおりになる（spec の「Done から戻すと元の位置に戻る」）。

- 代わりの案: Done にしたとき配列の末尾へ移す。→ 戻したときに元の位置が失われ、共有中の他の端末との競合でも並び順が大きく動く。採らない。
- 代わりの案: `Project` に `doneItems` を別に持つ。→ データ形式の version を上げて移行が必要になる。採らない。

### 2. 移動先は「over の PBI の全体の配列での位置」で渡す

`BacklogTable` の `onMove(number, toIndex)` を、`onMove(number, overNumber)` に変える（移動先の PBI の番号を渡す）。`App.tsx` は `project.items` から `overNumber` の位置を求めて、今までどおり `move` の `toIndex` にする。

`move` は「取り除いてから over の位置に差し込む」（`arrayMove` と同じ）ので、間に Done の PBI が挟まっていても、未完了どうしの前後関係は見えている順序どおりに変わる。例: 全体 `[1, 2(Done), 3]` で 3 を 1 の上へ → `toIndex = 0` → `[3, 1, 2]`。1 を 3 の上へ → `toIndex = 2` → `[2, 3, 1]`、未完了の一覧は `3, 1`。

- 代わりの案: `BacklogTable` に全体の配列も渡して中で変換する。→ 表が並び順の全体を知る必要が出る。番号で渡す方が表の責務が小さい。
- reducer は変えない。

キーボードの並べ替えも `SortableContext` が未完了の一覧だけを持つので、「1つ下」は未完了の一覧で直後の行になる。読み上げの「◯ 番目」も未完了の一覧の中の位置になる。

### 3. `BacklogTable` に `sortable` を足し、Done エリアにも同じ部品を使う

`BacklogTable` に `sortable?: boolean`（既定 true）と、表の名前を付ける `aria-labelledby`（または `label`）を足す。`sortable={false}` のときは `DndContext` と `SortableContext` を使わず、`useSortable` を呼ばない行を描く。持ち手の列は空のセルとして残し、未完了の一覧と列の幅を揃える。行の hover・選択・ステータス変更・コピーは同じ部品のまま。

- 実装: 行を「中身（セル群）」と「並べ替えの包み」に分け、`SortableRow` は `useSortable` の結果を `<tr>` と持ち手に渡し、`StaticRow` は持ち手なしで同じ中身を描く。フックを条件付きで呼ばないための分け方。
- 代わりの案: Done 用に別の表の部品を作る。→ 列・コピー・ステータスの表示が二重になり、見た目がずれやすい。採らない。

### 4. Done エリアの見た目

`docs/design-principles.md` に従い、箱やカード、折りたたみの矢印アイコンは使わない。

- 未完了の一覧の下に `--space-6`（24px）の間を空け、`<section aria-labelledby="done-heading">` を置く。
- 見出しの行は一覧の見出しの行（`.titleRow`）と同じ並びで、`<h2>` の「Done」（14px/700、本文色）と、集計（「◯ 件 · ◯ pt」、`.summary` と同じ gray-700・等幅数字）を並べる。見出しはページの見出し（18px）より小さくして階層を示す。
- 表は未完了の一覧と同じ表のスタイル（1px の罫線の行）。Done の行の文字を薄くするなどの差は付けない（ステータスの Lozenge の緑で十分区別できるため、追加の装飾をしない）。
- 未完了の一覧の空状態（すべて Done のとき）は、既存の `.empty` と同じ見た目で「未完了の PBI はありません。」とだけ出す。

### 5. 件数と合計

`App.tsx` の `items.length` と `totalPoints` を `active` から計算する。ステータス別 SP（`pointsByStatus`）は今までどおり `items` 全体から計算する。Done エリアの件数と合計は `done` から計算する。プロジェクト削除の確認文の「PBI ◯ 件」は削除される全件なので `items.length` のまま。

### 6. テストの補助

`rowTexts()` を、名前を付けた表の中だけを数える `rowTexts(tableName = '未完了の PBI')` のような形に変え、Done エリアは `rowTexts('Done')` で確かめる。未完了の一覧の表の名前は `aria-label="未完了の PBI"`、Done エリアの表は見出し「Done」を `aria-labelledby` で参照する。

## Risks / Trade-offs

- [すべてが Done のプロジェクトで並べ替えの手がかりが無くなる] → 仕様どおり。空状態の文で未完了が無いことを示す。
- [Done の PBI が多いと画面が長くなる] → 折りたたまないのはユーザーの選択。必要になれば別の PBI で折りたたみを足せるよう、Done エリアを1つの `section` にまとめておく。
- [共有中に他の端末でステータスが変わると、ドラッグ中の行が別の表に移る] → `SortableContext` の `items` が変わるだけで、ドロップ先の解決は番号で行うため誤った位置には動かない。ドロップ先の PBI が消えていれば `App` 側で何もしない。
- [見出しの件数の意味が変わる（BREAKING 表示）] → spec のシナリオとテストの期待値を同時に更新する。

## Migration Plan

データ形式は変えないため移行は不要。表示だけの変更なので、戻すときはこの change のコミットを revert すればよい。
