# Proposal

## Why

今のバックログ一覧は、Done になった PBI も To Do・In Progress の PBI と同じ表に混ざって並ぶ。完了済みの行が増えるほど、次に何をするべきかが一覧から読み取りにくくなる（PBI-5）。

## What Changes

- 一覧を2つに分ける。上の表には To Do と In Progress の PBI だけを、その下に新しく置く「Done」エリアには Done の PBI だけを並べる。
- ステータスを Done に変えた PBI は、一覧からでも詳細パネルからでも、すぐに Done エリアへ移る。Done から To Do / In Progress に戻した PBI は上の表に戻る。
- 2つの表のどちらでも、PBI はバックログの並び順を保って並べる。並べ替えた結果を新しく保存する形式は増やさないため、Done から戻した PBI は、完了する前と同じ相対位置に戻る。
- 並べ替え（ドラッグ・キーボード）ができるのは上の表だけにする。Done エリアでは並べ替えない。
- Done エリアは折りたたまず、常に開いて表示する。見出しに「Done」と、Done の件数と SP 合計を出す。Done の PBI が1件も無いときは、Done エリアを表示しない。
- **BREAKING（表示）**: 一覧の見出しの行の「◯ 件」「◯ pt」を、To Do と In Progress だけで数えるようにする。ステータス別の SP（To Do / In Progress / Done）はこれまでどおり3つとも表示する。

## Capabilities

### New Capabilities

（なし）

### Modified Capabilities

- `pbi-backlog`: 「バックログ一覧の表示」を未完了の表と Done エリアの2つに分ける。「ステータス」に Done エリアとの行き来を加える。「バックログの手動並べ替え」を上の表だけに限る。「ステータス別の SP 集計」の件数・合計を未完了だけにする。Done エリアの表示を新しい要件として加える。

## Impact

- 画面: `src/App.tsx`（件数・合計の計算、表を2つ描く）、`src/App.module.css`、`src/components/BacklogTable.tsx` / `.module.css`（並べ替えを持たない表としても使えるようにする）
- 状態: `src/backlog/reducer.ts` の `move` は全体の配列の位置で動くので、絞り込んだ表から移動先を渡すところで位置を合わせる。データ形式（`Backlog` version 2）、保存、共有、インポート・エクスポートは変えない
- テスト: `src/App.test.tsx` の件数・合計を確かめているテストのうち、Done を含むものの期待値が変わる
- 方針: `docs/design-principles.md` に Done エリアの見た目のルールを追記する
