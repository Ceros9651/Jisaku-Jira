# Tasks

## 1. ステータスを Lozenge 風のラベルにする

- [x] 1.1 src/styles/tokens.css に、ステータス用の薄い背景色 `--status-todo-bg`（灰）、`--status-progress-bg`（青）、`--status-done-bg`（緑）を追加する。各ステータスの文字色との組み合わせで、コントラスト比が 4.5:1 以上あることを確認する
- [x] 1.2 src/components/StatusSelect.module.css の `.select` を `appearance: none` にする。幅は文字に合わせ（`width: auto`、`field-sizing: content` が使えるブラウザでは併用）、角丸 4px、12px/700 の大文字（`text-transform: uppercase`）、`.todo` `.in_progress` `.done` で背景と文字色を切り替える。矢印は `background-image` の小さな線画にし、`tr:hover` の中にあるときと `:focus-visible` のときだけ表示する。開発者ツールで desktop 1440×900 にして、hover していない行には矢印が出ず、hover した行だけに出ることを確認する
- [x] 1.3 src/components/BacklogTable.module.css の `.statusCol` の幅を、いちばん長い「IN PROGRESS」ラベルが収まる幅まで詰める。mobile 390×844 でタイトル列が今より広くなることを確認する
- [x] 1.4 src/components/DetailPanel.module.css の `.meta select` の上書きを消し、詳細パネルのステータスが一覧と同じラベルの見た目になることを、`?reload=1#PBI-1` で開いて確認する

## 2. 一覧を幅いっぱいに広げる

- [x] 2.1 src/App.module.css の `.main` の `grid-template-columns` を `minmax(0, 1fr)` にする。desktop 1440×900 で、詳細パネルを閉じたとき表の右端が画面の右の余白（24px）の手前まで届くこと、パネルを開いたときは一覧の右にパネルが並ぶことを確認する

## 3. 見出しにステータス別の SP を出す

- [x] 3.1 src/App.tsx の見出しの行（`.titleRow`）で、`data-testid="backlog-summary"` の要素の後ろに、ステータス別の SP 合計（To Do / In Progress / Done）を、1.1 の色の小さなバッジで並べる。バッジにはステータス名を `title` と読み上げ用のテキストで付ける。App.test.tsx に、Done 3・In Progress 5・To Do 2・To Do 未設定のとき、To Do 2・In Progress 5・Done 3 が表示されるテストを追加して通す
- [x] 3.2 src/App.module.css の `.summary` の文字色を `--gray-700` にし、件数と合計の間を「·」で区切る。開発者ツールで、白地とのコントラスト比が 4.5:1 以上になることを確認する

## 4. 作成欄を枠の無い1行にする

- [x] 4.1 src/components/CreatePbiForm.tsx の入力欄の左に「+」（`aria-hidden`）を置く。src/components/CreatePbiForm.module.css の `.input` は枠と背景を消して下に 1px の罫線にし、高さを一覧の行（38px）に揃える。`.button` は枠線だけの secondary の見た目（`--border-strong` の枠、白地、文字色は本文）にする。sticky と、一覧の上という位置は変えない。desktop 1440×900 で、画面に塗りつぶした青のボタンが無いこと、25件入れてスクロールしても作成欄が上端に残ることを確認する

## 5. 詳細パネルの先頭を見出しにする

- [x] 5.1 src/components/DetailPanel.tsx で、タイトルのラベル「タイトル」を `visually-hidden` にする（`getByLabelText('タイトル')` で引ける状態を保つ）。src/components/DetailPanel.module.css の `.titleInput` は、普段は枠も背景も無い 18px/700 にし、hover で `--surface-sunken` の背景、focus で枠と focus リングを出す。`?reload=1#PBI-1` で、先頭が「PBI-1」とタイトルの見出しに見えることを確認する
- [x] 5.2 src/components/DetailPanel.module.css の `.meta` を、ステータスと SP を「ラベル左（幅 96px 程度）・値右」の2行にするレイアウトに変える。laptop 1280×720 で、パネルの縦が今より短くなり、ステータスのラベルが一覧と同じ見た目で並ぶことを確認する

## 6. 確認

- [x] 6.1 `npm test` と `npm run typecheck` が通ることを確認する
- [x] 6.2 （ユーザーが実行）`/ui-review --verify ui-refine-backlog` で Before/After を確認する。実装担当はこのタスクにチェックを付けない
