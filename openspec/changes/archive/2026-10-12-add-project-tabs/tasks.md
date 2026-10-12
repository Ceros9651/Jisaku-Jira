# Tasks

## 1. データ形式 version 2 と旧形式の変換

- [x] 1.1 src/backlog/model.ts に `Project` 型を足し、`Backlog` を `version: 2` / `nextNumber` / `nextProjectId` / `projects` に変える。`emptyBacklog()` は「マイプロジェクト」（id 1）1つと `nextProjectId: 2` を返す。既定名 `DEFAULT_PROJECT_NAME` とエラー文 `PROJECT_NAME_REQUIRED`（「プロジェクト名を入力してください」）を定数で足す。テスト用に、1つのプロジェクトに PBI を入れた Backlog を作る関数を src/test/ に置く。`npm run typecheck` で残りの型エラーの場所を確認する（この時点では reducer などが落ちてよい）
- [x] 1.2 src/backlog/validate.ts の `validateBacklog` を version で分岐させる。version 1 は今の検証のうえで「マイプロジェクト」1つの version 2 に変換し、version 2 は projects が1つ以上・id が重複しない正の整数・name が空でない・PBI 番号がプロジェクトをまたいで重複しないことを検証し、`nextNumber` と `nextProjectId` を最大値＋1 以上に引き上げる。src/backlog/validate.test.ts に、version 1 の変換（並び順・nextNumber が変わらない）、version 2 の正常系、projects が空・名前が空・id 重複・プロジェクトをまたぐ番号の重複・未対応の version のテストを足して通す
- [x] 1.3 storage.test.ts と transfer.test.ts を version 2 のデータに直し、version 1 の JSON を保存データとして置いた `loadBacklog` が version 2 で返るテストを足す。`npx vitest run src/backlog/storage.test.ts src/backlog/transfer.test.ts src/backlog/validate.test.ts` が通ることを確認する

## 2. reducer のプロジェクト操作

- [x] 2.1 src/backlog/reducer.ts の `create` に `projectId` を足し、そのプロジェクトの末尾に追加する。`update` / `delete` / `move` は番号から属するプロジェクトを探し、そのプロジェクトの `items` だけを変える。reducer.test.ts を新しい形に直し、2つのプロジェクトにまたがる通し番号、別プロジェクトへの作成が他方に入らないこと、`move` が他のプロジェクトの順序を変えないこと、無い projectId の `create` を無視することのテストを足して通す
- [x] 2.2 `createProject` / `renameProject` / `deleteProject` を足す。名前は前後の空白を除き、空なら無視。`createProject` は `nextProjectId` を id にして末尾に足し、`nextProjectId` を1増やす。`deleteProject` は最後の1つと無い id を無視し、`nextNumber` は減らさない。reducer.test.ts に、作成・名前変更（PBI が変わらない）・削除（他のプロジェクトの PBI が残る、削除後も PBI 番号が再利用されない）・空の名前・最後の1つの削除のテストを足して通す
- [x] 2.3 useBacklog.test.ts を新しい形に直して通す。`npm test` で src/backlog/ 配下がすべて通ることを確認する（App.test.tsx は 3 群で直す）

## 3. 選択中のプロジェクトの決定と記憶

- [x] 3.1 src/backlog/storage.ts に `ACTIVE_PROJECT_KEY = 'jisaku-jira:active-project'` と `loadActiveProject(storage)` / `saveActiveProject(storage, id)` を足す。読めない値・例外・null のストレージでは null を返し、書き込みの失敗は無視する。storage.test.ts にそれぞれのテストを足して通す
- [x] 3.2 src/useActiveProject.ts に、design の順（ハッシュの PBI のプロジェクト → 記憶した id → 最初のプロジェクト）で選択中のプロジェクトを決め、選んだ id を記憶するフックを作る。ハッシュから決まったときも記憶を更新する。App.tsx をこのフックに繋ぎ、一覧・件数・SP 集計・ステータス別 SP・作成先を選択中のプロジェクトだけにし、見出し h1 をプロジェクト名にする。インポートの確認文をプロジェクト数と件数の両方にし、インポート後は最初のプロジェクトを選ぶ。App.test.tsx の既存テストを新しいデータ形式に直し、「別のプロジェクトの PBI のリンクで開くとそのプロジェクトが選ばれ詳細が開く」「無い PBI のリンクでは記憶したプロジェクトの一覧だけ」「version 1 の保存データで開くとマイプロジェクトに PBI が並び、次の ID が続く」「件数と合計が他のプロジェクトを含まない」テストを足して `npm test` を通す

## 4. プロジェクトのタブと操作

- [x] 4.1 src/components/ProjectTabs.tsx を作る。`role="tablist"` / `role="tab"` / `aria-selected`、選択中だけ `tabIndex=0`、左右の矢印・Home・End で移動と選択。一覧の領域を `role="tabpanel"` にして選択中のタブを `aria-labelledby` で指す。タブを押すと `select(null)` で詳細パネルを閉じてから切り替える。App.test.tsx に、タブを押すと一覧が切り替わり選択中になること、詳細パネルが閉じてハッシュが消えること、右矢印で隣のタブに切り替わること、再読み込み（再マウント）後も同じタブが選ばれることのテストを足して通す
- [x] 4.2 タブの末尾に文字のボタン「プロジェクトを追加」を置き、押すと名前の入力欄に変える。Enter で作成して新しいプロジェクトに切り替え、Escape で取り消す。空で Enter のときは `PROJECT_NAME_REQUIRED` を `role="alert"` で出す。App.test.tsx に、作成するとタブの末尾に追加されて空のバックログが出ること、空の名前のエラー、Escape で作られないことのテストを足して通す
- [x] 4.3 一覧の見出しの行の右端に文字のボタン「名前を変更」「削除」を置く。名前の変更は見出しの位置で入力欄に変え、Enter で確定・Escape で取り消し、空ならエラーを出す。削除は ConfirmDialog（`danger`）で「『<名前>』と PBI <件数> 件を削除します。元に戻せません。」と出し、確定で削除して左隣（無ければ右隣）に切り替える。プロジェクトが1つのときは「削除」を `disabled` にする。App.test.tsx に、名前変更でタブと見出しが変わり PBI がそのまま残ること、空の名前のエラー、確認して削除すると PBI ごと消えて左隣に切り替わること、取り消すと何も変わらないこと、1つだけのとき削除できないことのテストを足して通す
- [x] 4.4 src/components/ProjectTabs.module.css と App.module.css にスタイルを足す。帯は `--surface-sunken` の背景で下端 1px の罫線、タブは文字だけ（箱・角丸・影なし）、選択中は本文色・太字・下端 2px の `--accent`、他は `--gray-700` で hover は本文色。タブの並びは `overflow-x: auto`。「プロジェクトを追加」「名前を変更」「削除」は muted の文字ボタン。余白はトークンの段階から選ぶ。`npm run dev` で desktop 1440×900 と mobile 390×844 を開き、プロジェクトを 8 個作ってもページ全体が横スクロールせず、タブの帯だけがスクロールすること、選択中のタブが見分けられることを確認する
- [x] 4.5 docs/design-principles.md に「プロジェクトの切り替えは文字だけのタブにし、選択中は太字と下端 2px のアクセント色の線で示す。タブを箱や角丸で包まない。（add-project-tabs）」を追記し、「アクセント色を使うのは」の行に選択中のタブを足す。README の機能一覧にプロジェクトのタブ（作成・名前変更・削除、PBI の ID は全プロジェクトで通し番号、リンクを開くとそのプロジェクトに切り替わる）を足し、データの保存とバックアップの節に「エクスポート・インポートは全プロジェクトまとめて行う。以前のファイルも読み込め、『マイプロジェクト』1つに入る」を足す

## 5. 確認

- [x] 5.1 `npm test`、`npm run typecheck`、`npm run build` が通ることを確認する。`npm run dev` で、version 1 の保存データ（localStorage に旧形式の JSON を置く）から開いて「マイプロジェクト」に PBI が並ぶこと、プロジェクトを2つ作って PBI を分けて再読み込みしても残ること、エクスポートしたファイルをインポートし直すと同じ状態に戻ること、別のプロジェクトの PBI をコピーしたリンクを新しいタブで開くとそのプロジェクトに切り替わって詳細が開くことを確認する
