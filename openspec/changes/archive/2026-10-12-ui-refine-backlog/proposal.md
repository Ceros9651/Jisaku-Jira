# Proposal

## Why

`/ui-review バックログ` で、Jira のバックログと比べて見劣りする点が5つ見つかった。カードや影などの「AIっぽさ」はほとんど無いが、次の点で読む順番と操作の手がかりが分かりにくい。

- ステータスがブラウザ標準のプルダウンのままで、全行に矢印が縦に並ぶ。ラベルではなく入力欄に見える。詳細パネルの中だけ枠付きで、一覧と見た目が揃っていない。
- デスクトップで一覧が幅 960px で止まり、右の約450px が空いている。それなのに長いタイトルは「…」で切れる。
- 見出しの集計（件数・SP 合計）が小さく薄い灰色で、コントラストが足りない（約3.9:1）。どれだけ終わったかも分からない。
- 一覧の上の入力欄と、画面でただ1つの青く塗りつぶした「作成」ボタンが、一覧より先に目に入る。
- 詳細パネルが「タイトル」のラベルと枠付きの入力欄から始まり、設定画面のフォームのように見える。PBI の名前が見出しとして読めない。

## What Changes

- ステータスを Lozenge 風のラベルにする（参考: Jira の Lozenge と Lozenge dropdown trigger）。文字幅に合わせた、薄い背景の大文字ラベルにし、色は To Do＝灰・In Progress＝青・Done＝緑の3種にする。矢印は行に hover したときか focus したときだけ出す。一覧と詳細パネルで同じ見た目にする。
- 一覧をコンテンツ領域の幅いっぱいに広げる（参考: Jira のバックログ。セクションが幅いっぱいに広がり、詳細を開くと右側に並ぶ）。
- 見出しの集計に、ステータス別の SP をステータスと同じ色の小さなバッジで並べ、文字色を濃くする（参考: Jira のバックログ／スプリントのヘッダーにある、灰・青・緑の SP の数字）。
- 作成欄は一覧の上に固定したまま、枠の無い1行（左に「+」、下に罫線）にし、「作成」ボタンは枠線だけの控えめなボタンにする（参考: Jira のインライン作成の行。入力欄が一覧の行と同じ見た目になっている）。
- 詳細パネルの先頭を、ID と、枠の無い見出しに見えるタイトルにする。ステータスと SP は「ラベル左・値右」の行にする（参考: Jira の作業項目の詳細表示。キーの下に要約を大きく置き、その場で編集でき、Details はラベルと値を左右に並べている）。
- データや操作（保存される値、作成・編集・保存・削除・並べ替えの手順、画面遷移）は変えない。ステータスの変更は今までどおりプルダウン（select）で行う。

## Capabilities

### New Capabilities

（なし）

### Modified Capabilities

- `pbi-backlog`: 一覧・見出し・作成欄・詳細パネルの見た目の要件を足す（既存の要件は変えない）。この capability は change `add-pbi-backlog` で作られるので、`add-pbi-backlog` を先にアーカイブする。

## Impact

- 変えるファイル:
  - src/components/StatusSelect.tsx と StatusSelect.module.css（`.select` `.todo` `.in_progress` `.done`）
  - src/components/BacklogTable.module.css（`.statusCol`）
  - src/App.tsx と App.module.css（`.main` `.summary`、集計の内訳）
  - src/components/CreatePbiForm.module.css（`.form` `.input` `.button`）
  - src/components/DetailPanel.tsx と DetailPanel.module.css（`.header` `.id` `.titleInput` `.meta` `.label` `.field`）
  - src/styles/tokens.css（ステータス用の薄い背景色を3つ追加）
- 影響する他画面: なし（この画面だけ）。StatusSelect は一覧と詳細パネルの両方で使っているが、どちらもこの画面の中にある。
- テスト: select と各要素のアクセシブルな名前は変えないので、App.test.tsx はそのまま通る想定。集計の内訳は `data-testid="backlog-summary"` の外に置き、`'3 件8 pt'` の期待値を壊さない。詳細パネルの「タイトル」ラベルは画面上だけ隠し、`getByLabelText('タイトル')` で引けるようにする。
- 検証: `/ui-review --verify ui-refine-backlog` の Before/After のスクショと実機で確認する。
- 参考スクショ: `screenshots/before-*.png`
