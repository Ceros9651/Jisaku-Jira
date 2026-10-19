# Tasks

## 1. 詳細パネルの保存・削除の行を下端に貼り付ける

- [x] 1.1 src/components/DetailPanel.module.css の `.actions` を `position: sticky; bottom: 0` にし、パネルの左右の余白ぶん外に広げて（`margin: 0 calc(-1 * var(--space-5))`、`padding: var(--space-3) var(--space-5)`）、`background: var(--surface)` と `border-top: 1px solid var(--border)` を付ける。影は付けない。`.panel` の下の余白（`var(--space-6)`）は、行が下端に接するよう 0 にする。760px 以下（パネルが一覧の下に来る）では今までどおり流れの中に置く。開発者ツールで laptop 1280×720 にして `#1/PBI-7` を開き、スクロールせずに「保存」と「削除」が見えること、パネルを一番下までスクロールしても行が下端に残り、受入条件の欄に重なって読めなくならないことを確認する

## 2. ステータス別の SP を区画ごとに数える

- [x] 2.1 src/App.tsx の `pointsByStatus` を、未完了の区画用（`activeItems` から To Do と In Progress の2つ）と Done の区画用（`doneItems` から Done の1つ）に分ける。Done の区画の見出しの行にも `aria-label="ステータス別の SP"` のリスト（右端）を置き、未完了の区画には Done のバッジを出さない。src/App.module.css の `.statusPoints` は2か所で同じ見た目になることを確かめる。desktop 1440×900 で、未完了の区画のバッジの合計が「n pt」と一致し、Done の区画の右端に緑の Done のバッジだけが出ることを確認する
- [x] 2.2 src/App.test.tsx の「見出しにステータス別の SP を出す」と「区画の見出しの行に件数・合計とステータス別の SP を出し…」の期待値を、区画ごとの値（未完了は To Do・In Progress の2つ、Done は Done の1つ）に直す。spec の「区画のバッジの合計は区画の SP 合計と一致する」のテストを足す

## 3. スマホでは一覧の行を2段にする

- [x] 3.1 src/components/BacklogTable.module.css の 560px 以下のメディアクエリで、`.row` を CSS grid（`grid-template-columns: 20px auto 1fr auto auto`、`grid-template-areas: "handle title title title title" "handle id status points copy"` 程度）にし、各 `td` に `grid-area` を割り当てる。DOM の順は変えない（読み上げの順を保つ）。タイトルは1段目で幅いっぱいに出し、2行まで折り返してよい。行の下の罫線は行全体に引き、各セルの `height: 38px` は 2段のときは外す。`.statusCol select` の `font-size: 11px` を消して 12px にする。種類のアイコンの列は今までどおり出さない。mobile 390×844 で、タイトルが省略されずに読めること、2段目に ID・ステータス・SP・コピーが並ぶこと、横スクロールが出ないこと、並べ替えの持ち手でドラッグできることを確認する
- [x] 3.2 desktop 1440×900 と laptop 1280×720 で、行が1段のままで見た目が変わっていないことを確認する

## 4. 行の右側の項目を右揃えで詰める

- [x] 4.1 src/components/BacklogTable.module.css の `.statusCol` に `text-align: right` を付け、幅を「In Progress」のラベルが収まる 120px 程度にする。`.pointsCol` を 40px 程度に詰め、ステータス・SP・コピーの間が 8px 前後になるようにする。desktop 1440×900 で、「In Progress」の行と「To Do」の行で、ステータスのラベルの右端から SP のバッジまでの距離が同じになることを確認する。詳細パネルのステータスの見た目が変わっていないことも確認する

- [ ] 4.2 src/components/BacklogTable.module.css の `.copy` を `text-align: left` にし、`.copyCol` の左の余白を 0 にして、SP のバッジの直後に 8px で「コピー」が来るようにする（`.copy` の幅 54px は残し、「コピー失敗」に変わっても列がずれないようにする）。desktop 1440×900 と laptop 1280×720 で、SP のバッジの右端から「コピー」の文字の左端までがどの行も 8px 前後になること、SP が未設定の行でもコピーの位置がずれないことを確認する
- [ ] 4.3 同じファイルの 560px 以下のメディアクエリで、2段目の grid の列を `48px auto auto auto 1fr` 程度にし、ステータスを `text-align: left`・幅は中身なりにして、ID の後ろにステータス・SP・コピーを左から 8px 間隔（`column-gap`）で並べる。mobile 390×844 で、「In Progress」の行と「To Do」の行でステータスの右端から SP のバッジまでの距離が同じになること、横スクロールが出ないこと、1段目のタイトルの見え方が変わっていないことを確認する
- [ ] 4.4 4.2・4.3 を受けて src/App.test.tsx 等で見た目に関わる期待値が変わる場合は直し、`npm run typecheck` と `npm test` が通ることを確認する

## 5. 確認

- [x] 5.1 `npm run typecheck` と `npm test` が通ることを確認する
- [ ] 5.2 （ユーザーが実行）`/ui-review --verify ui-refine-backlog-2` で Before/After を確認する。実装担当はこのタスクにチェックを付けない
