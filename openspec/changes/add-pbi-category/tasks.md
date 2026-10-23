# Tasks

## 1. カテゴリのデータと読み込み

- [ ] 1.1 src/backlog/model.ts に `Category` 型、`CATEGORIES`、`CATEGORY_LABELS`（タスク / バグ / テスト / 運用）、`DEFAULT_CATEGORY = 'task'`、`isCategory` を足し、`Pbi` に必須の `category` を足す。src/test/backlog.ts の `pbi()` の既定値に `category: 'task'` を足す。`npm run typecheck` で、残りの型エラーが validate.ts と reducer.ts だけであることを確認する
- [ ] 1.2 src/backlog/validate.ts の `validateItems` で、`category` が無ければ `DEFAULT_CATEGORY`、`isCategory` を通らなければ「`<label>`の category が不正です」で失敗させる。validate.test.ts に、カテゴリ付きの version 2 がそのまま読めること、カテゴリの無い version 2 と version 1 の PBI が `task` になること、`category: 'epic'` で失敗することのテストを足して `npx vitest run src/backlog/validate.test.ts` を通す
- [ ] 1.3 transfer.test.ts に、カテゴリ `bug` と `ops` の PBI をエクスポートした JSON を読み直すとカテゴリが保たれるテストを足し、`npx vitest run src/backlog/transfer.test.ts src/backlog/storage.test.ts` を通す

## 2. reducer と Markdown

- [ ] 2.1 src/backlog/reducer.ts の `create` に `category?: Category` を足し（省略時は `DEFAULT_CATEGORY`、不正な値なら元の状態を返す）、`PbiChanges` と `applyChanges` に `category` を足して `isCategory` で確かめる。reducer.test.ts に、カテゴリを省略した作成が `task` になること、`bug` を指定した作成、不正なカテゴリの作成・更新が無視されること、更新でカテゴリだけが変わり ID と位置が変わらないことのテストを足して通す
- [ ] 2.2 remote.test.ts に、カテゴリの無い共有データに `create`（category `test`）を適用すると、既存の PBI が `task`、新しい PBI が `test` の JSON になるテストを足して通す
- [ ] 2.3 src/backlog/share.ts の `formatPbiMarkdown` で、リンクの行の次に `- カテゴリ: <名前>` を足す。share.test.ts の期待値を pbi-copy の spec の例と同じ文字列に直し、カテゴリ `バグ` の行のテストを足して通す。`npm test` で src/backlog/ 配下がすべて通ることを確認する

## 3. アイコンと選択のコンポーネント

- [ ] 3.1 src/styles/tokens.css に `--category-task`（青）/ `--category-bug`（赤）/ `--category-test`（紫）/ `--category-ops`（橙）を足す。どれも白との対比が 3:1 以上で、`--accent`・ステータスの色・`--danger` と別の値にする（対比はトークンの横にコメントで書く）
- [ ] 3.2 src/components/CategoryIcon.tsx を作る。16×16 の SVG に角丸 2px の地と白い記号（タスク＝チェック、バグ＝丸、テスト＝三角、運用＝横線2本）を、端を整数ピクセルに合わせて描く。`role="img"`・`aria-label` と `<title>` にカテゴリ名を入れる。src/components/CategoryIcon.test.tsx に、4つのカテゴリでそれぞれ `getByRole('img', { name: 'バグ' })` などで見つかること、`<title>` の文字がカテゴリ名であることのテストを書いて通す
- [ ] 3.3 src/components/CategorySelect.tsx と CategorySelect.module.css を作る。左に選択中の CategoryIcon（`aria-hidden`）、右に枠の無い文字だけの `<select>`（4つの選択肢、空の選択肢なし、矢印は hover・focus のときだけ）を並べ、読み上げ名は props で受け取る。CategorySelect.test.tsx に、選択肢が4つだけであること、選ぶと `onChange` に `bug` などのキーが渡り、表示中のアイコンが変わることのテストを書いて通す

## 4. 画面への組み込み

- [ ] 4.1 BacklogTable に持ち手と ID のあいだの `.categoryCol`（24px、560px 以下は 20px、見出しは visually-hidden の「カテゴリ」）を足し、各行に CategoryIcon を置く。App.test.tsx に、カテゴリ `bug` の PBI の行に「バグ」の img があり、ID のセルより前にあることのテストを足して通す
- [ ] 4.2 CreatePbiForm の `+` を CategorySelect（読み上げ名「新しい PBI のカテゴリ」）に置き換え、カテゴリの状態を持って `onCreate(title, category)` で渡す。作成後はタイトルだけを空にする。App.tsx の `create` の dispatch に `category` を足す。App.test.tsx に、カテゴリを変えずに作ると `タスク` の img が出ること、`バグ` を選んで作るとその行に `バグ` の img が出ること、続けて作ると作成欄が `バグ` のままで2件目も `バグ` になることのテストを足して通す
- [ ] 4.3 DetailPanel の `.meta` の先頭に「カテゴリ」の行（CategorySelect、読み上げ名「カテゴリ」）を足し、カテゴリを下書きに入れて `dirty` と「保存」に含める。App.test.tsx に、`PBI-2` のカテゴリを `運用` に変えて保存すると一覧の行のアイコンが「運用」になり ID と位置が変わらないこと、保存せずに別の PBI に切り替えるとカテゴリが変わらないことのテストを足して `npm test` を通す
- [ ] 4.4 `npm run dev` で desktop 1440×900 と mobile 390×844 を開き、4つのカテゴリの PBI を並べて、アイコンが形でも見分けられること、選択中の行の背景の上でも見えること、ID の桁が揃っていること、作成欄と詳細パネルのカテゴリの選択が行の高さを崩さないこと、mobile でページが横スクロールしないことを確認する

## 5. ドキュメント

- [ ] 5.1 docs/design-principles.md の「例外」の節に、カテゴリのアイコン（機能を持つアイコンで、色と形で区別し、名前を読み上げとツールチップで示す）と、カテゴリの地の色（ステータス以外で色を使う唯一の例外、アイコンの中だけ、バグの赤はエラーの赤と別の値）を、由来 `（add-pbi-category）` 付きで追記する。「作成欄は…」の行に、先頭はカテゴリの選択にすることを足す
- [ ] 5.2 README の機能一覧に、PBI のカテゴリ（タスク / バグ / テスト / 運用、一覧の ID の左のアイコン、作成欄と詳細パネルで指定、カテゴリの無い以前のデータはタスクになる）を足し、コピーの内容の括弧に「カテゴリ」を足す

## 6. 確認

- [ ] 6.1 `npm test`、`npm run typecheck`、`npm run build` が通ることを確認する。`npm run dev` で、カテゴリの無いエクスポートファイルをインポートすると全件がタスクのアイコンで出ること、カテゴリ `テスト` の PBI を作って再読み込みしても残ること、エクスポートし直したファイルに `category` が入っていること、コピーした Markdown に「- カテゴリ: 」の行があることを確認する
