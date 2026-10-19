# Proposal

## Why

`/ui-review バックログ` で、change `jira-like-ui` で Jira に寄せた後の画面を見たところ、飾りのアイコンや強い影などの「AIっぽさ」は無かった。ただし、次の4点で操作の手がかりと数字の読み取りが分かりにくい。

- 詳細パネルの「保存」が、大きな説明・受入条件の欄の下にあり、最初に見える範囲の外にある（1440×900 でほぼ見えず、1280×720 では保存も削除も見えない）。PBI を切り替えると下書きは消えるので、保存に気づかないと編集を失う。
- 未完了の区画の右端のステータス別 SP に Done の SP が入っていて、隣の「n pt」と合わない。同じ Done の数字が、下の Done の区画にも出ている。
- スマホ（390 幅）でタイトルが3〜4文字しか読めず、どの PBI か分からない。ステータスの文字が、方針の段階に無い 11px になっている。
- 行の右側で、ステータスと SP の間が行ごとに違い（In Progress の行で約 56px、To Do の行で約 90px）、SP のバッジがどの項目に属するか読みにくい。

## What Changes

- 詳細パネルの保存・削除の行を、パネルの下端に貼り付ける。白地と上の 1px の罫線で区切り、影は付けない（参考: Jira の課題ビュー。説明の編集では、編集している場所の直下に Save / Cancel が出て、保存の操作にいつも手が届く）。
- ステータス別の SP のバッジを区画ごとに、その区画の PBI だけで数える。未完了の区画は To Do と In Progress の2つ、Done の区画は Done の1つにする（参考: Jira のバックログ。灰・青・緑の SP の数字はスプリントごとの見出しの右上に出て、そのスプリントの課題だけを数える）。
- 幅 560px 以下では一覧の行を2段にし、1段目にタイトルを幅いっぱいに、2段目に ID・ステータス・SP・コピーを並べる。ステータスの文字は 12px にする（参考: GitHub の Issues 一覧。1行目にタイトル、その下の小さな行に番号などの補足を出し、狭い幅でもタイトルを優先している）。
- 行の右側の項目（ステータス・SP・コピー）を右揃えにし、8px 間隔で詰めて並べる。幅 560px 以下の2段の行では、2段目の ID の後ろに同じ 8px 間隔で左から並べる（参考: ユーザーが共有した本家 Jira のバックログのスクリーンショット。要約の後ろの空きを挟んで、右端にステータスと見積もりのバッジがまとまっている）。
- データや操作（保存される値、作成・編集・保存・削除・並べ替えの手順、画面遷移）は変えない。

## Capabilities

### New Capabilities

（なし）

### Modified Capabilities

- `pbi-backlog`: 「ステータス別の SP 集計」と「一覧の区画」を、区画ごとに数える形に変える。詳細パネルの保存の操作の位置、狭い画面の一覧の行、行の右側の項目の並びの要件を足す。「一覧の区画」と、今の形の「ステータス別の SP 集計」は change `jira-like-ui` で入るので、`jira-like-ui` を先にアーカイブする。

## Impact

- src/components/DetailPanel.module.css（`.actions` を下端に貼り付ける）
- src/App.tsx（`pointsByStatus` を区画ごとに計算し、Done の区画の見出しにもバッジを出す）、src/App.module.css（`.statusPoints`）
- src/components/BacklogTable.module.css（560px 以下の2段の行、11px の指定の削除、`.statusCol`・`.pointsCol` の揃えと幅）
- 影響する他画面: なし（この画面だけ。BacklogTable は未完了と Done の両方の表で使う。StatusSelect は変えない）
- テスト: src/App.test.tsx の「見出しにステータス別の SP を出す」（To Do 2・In Progress 5・Done 3 を期待）と「区画の見出しの行に件数・合計とステータス別の SP を出し…」（To Do 8・In Progress 0・Done 2 を期待）の期待値が変わる
- 検証: `/ui-review --verify ui-refine-backlog-2` の Before/After スクショと実機で確認する。
- 参考スクショ: `screenshots/before-*.png`
