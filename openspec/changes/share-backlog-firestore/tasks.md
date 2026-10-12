# Tasks

## 1. 依存と接続設定

- [x] 1.1 `npm install firebase` で依存を足す。.env.example に `VITE_FIREBASE_API_KEY` / `VITE_FIREBASE_AUTH_DOMAIN` / `VITE_FIREBASE_PROJECT_ID` / `VITE_FIREBASE_APP_ID` の項目名だけを置き、.gitignore に `.env.local` と `.env.*.local` を足す。src/vite-env.d.ts（無ければ作る）に `ImportMetaEnv` の型を足す。`npm run typecheck` が通ることを確認する
- [x] 1.2 firestore.rules（design のルール: `backlogs/shared` だけ read と create/update を許し、`json` は 900000 文字未満の文字列、キーは `json`・`ops`・`updatedAt` だけ）と firebase.json（`firestore.rules` を指す）を置く。ファイルがあることと、ルールに `delete` を許す行が無いことを確認する

## 2. 共有データの窓口

- [x] 2.1 src/backlog/remote.ts に `RemoteSnapshot` と `BacklogRemote`（`subscribe` / `apply`）の型を置く。src/test/remote.ts に、メモリ上の JSON 文字列を持ち、`apply` で `parseBacklogJson` → `backlogReducer` → 全購読者へ配信する偽物を作る。テスト用に、他の端末からの書き込みを模す `push(backlog | text)`、`apply` を失敗させる `failNext()`、`subscribe` をエラーにする `failSubscribe(message)`、配信を手で進める `hold()` / `flush()` を持たせる。src/backlog/remote.test.ts で、偽物に2つの購読者をつなぎ、片方の `apply` がもう片方に届くこと、読めない JSON の上では `apply` が reject されて内容が変わらないことを確かめて通す
- [x] 2.2 src/backlog/firebase.ts に、環境変数から設定を作る `firebaseConfigFromEnv(env)`（足りなければ null）と、Firestore 実装 `createFirestoreRemote(config)` を作る。`subscribe` は `onSnapshot(doc(db, 'backlogs', 'shared'))` で、無ければ `missing`、あれば `json` を返し、エラーはメッセージを返す。`apply` は `runTransaction` で design の手順（無ければ `emptyBacklog()`、読めなければ reject、変わらなければ書かない、`serverTimestamp()` と一緒に `set`）を行う。設定が無いときの `unconfiguredRemote`（`subscribe` が即「共有データの接続先が設定されていません」を返す）も置く。src/backlog/firebase.test.ts で `firebaseConfigFromEnv` の揃っている／欠けている場合を確かめて通す（Firestore 実装そのものは 6.1 で実機確認する）

## 3. useBacklog を共有データにつなぐ

- [x] 3.1 src/backlog/useBacklog.ts を `useBacklog(remote)` に書き換える。`server` と `pending` を持ち、表示する `backlog` を `pending.reduce(backlogReducer, server)` にする。`status`（`loading` / `ready` / `error`）と `connectionError` を返す。受信した文字列は `parseBacklogJson` に通し、読めなければ `loadError` にする。`dispatch` は `pending` に足して `remote.apply` し、成功で外す、失敗で外して `saveFailed` を立てる。`replace` は同じ経路で `Promise<boolean>` を返す。`startEmpty` は `replace(emptyBacklog())` にする。`loadError` の間は `dispatch` を無視する
- [x] 3.2 src/backlog/useBacklog.test.ts を偽物の remote で書き直す。最初の受信までは `loading`、`missing` で空のバックログの `ready`、操作が保存前に表示されること、`apply` 失敗で表示が戻り `saveFailed` が立つこと、別の端末からの `push` が反映されること、`hold()` 中に他の端末の変更が届いても未確定の自分の操作が重なって表示されること、2つのフックから同時に `create` しても番号が重複しないこと、別々の PBI の `update` が両方残ること、読めない共有データで `loadError` になり書き込まないこと、`failSubscribe` で `error` になることを確かめて `npx vitest run src/backlog/useBacklog.test.ts` を通す

## 4. このブラウザに残った以前のデータ

- [x] 4.1 src/backlog/storage.ts から `saveBacklog` を消し、`loadBacklog` を `loadLegacyBacklog` に名前を変えて残し、`removeLegacyBacklog(storage)`（失敗は無視）を足す。`STORAGE_KEY` の名前は `LEGACY_STORAGE_KEY` にする。プロジェクトの記憶の関数はそのまま残す。src/backlog/storage.test.ts を合わせて直し、version 1 の以前のデータが version 2 で読めること、`removeLegacyBacklog` でキーが消えること、読めないデータでは `error` を返すことを確かめて通す

## 5. 画面

- [x] 5.1 App の props を `{ remote: BacklogRemote; storage?: Storage | null }` にし、main.tsx で `firebaseConfigFromEnv(import.meta.env)` から Firestore 実装（無ければ `unconfiguredRemote`）を作って渡す。`status` が `loading` の間はヘッダーと「読み込み中…」だけ、`error` の間はヘッダーと「共有データを読み込めませんでした」・理由・「再読み込み」ボタンだけを出す（インポートとエクスポートも出さない）。保存失敗の帯を「変更を保存できませんでした。接続を確認して、もう一度操作してください。」にし、閉じるボタンを付ける。読み込みエラーの画面の文言を「共有データ」に直し、「空で始める」の確認文に他の人のデータも消えることを書く。インポートの確認文に「他の人の画面の内容も置き換わります。」を足す。App.test.tsx と他のテストを偽物の remote で動くよう直し（`render(<App remote={remote} />)` のヘルパーを src/test/ に置く）、読み込み中・接続エラー・保存失敗で PBI が消えて帯が出ること・他の端末で作成した PBI が一覧に出ること・開いている PBI が他の端末で削除されると詳細パネルが閉じること・表示中のプロジェクトが他の端末で削除されると最初のタブになること・インポートが共有データを置き換えること・共有データにある PBI のリンク（ハッシュ）で開くと読み込み後に詳細が開くことのテストを足して `npm test` を通す
- [x] 5.2 以前のデータの帯を作る。起動時に `loadLegacyBacklog` で読めたときだけ、一覧の上に「このブラウザに以前のデータ（N プロジェクト・M 件）が残っています。」と文字ボタン「共有データに取り込む」「ファイルに書き出す」「このブラウザから消す」を出す（`status` が `ready` のときだけ）。取り込むはインポートと同じ確認ダイアログを「このブラウザの以前のデータ」の名前で出し、`replace` が true なら `removeLegacyBacklog` して帯を消す。書き出すは `downloadBacklog(以前のデータ)`。消すは ConfirmDialog（`danger`）を経て `removeLegacyBacklog` して帯を消す。App.test.tsx に、以前のデータがあると帯と件数が出て共有データが変わらないこと、取り込みの確認で置き換わり localStorage のキーと帯が消えること、取り込みの保存に失敗するとキーと帯が残ること、消すとキーが消えて共有データが変わらないこと、version 1 の以前のデータを取り込むと「マイプロジェクト」に入り次の ID が続くこと、読めない以前のデータでは帯が出ずキーも残ることのテストを足して `npm test` を通す
- [x] 5.3 App.module.css に必要な分だけスタイルを足す（読み込み中と接続エラーは既存の `.loadError` の形、以前のデータの帯は `.warning` の形、ボタンは既存の文字ボタン）。docs/design-principles.md と .claude/skills/ui-review/anti-patterns.md に照らし、スピナー・アイコン・角丸カードを足していないことを確かめる。`npm run dev` を偽の設定なし（接続エラーの表示）で開き、desktop 1440×900 と mobile 390×844 で読み込み中・接続エラー・以前のデータの帯が崩れず、ページが横スクロールしないことを確認する

## 6. 公開の準備と手順

- [x] 6.1 Firebase プロジェクトを無料プラン（Spark、支払い方法を登録しない）で作り、Firestore を有効化して `firebase deploy --only firestore:rules` でルールを反映する（**ユーザーの手作業**。apply ではここで手順を示して止まり、完了を確認してから進む）。`.env.local` に値を入れて `npm run dev` を2つのブラウザ（通常とシークレット）で開き、片方での作成・編集・並べ替え・削除・プロジェクトの作成と削除がもう片方に再読み込みなしで出ること、両方で別々の PBI を編集して両方残ること、`#PBI-<番号>` をもう片方で開くと詳細が開くこと、DevTools でオフラインにして操作すると保存失敗の帯が出て表示が戻ることを確認する。Firestore のコンソールで `backlogs/shared` 以外への書き込みと `delete` がルールで拒否されることを Rules Playground で確認する
- [x] 6.2 .github/workflows/deploy.yml の build ステップに `env:` で `VITE_FIREBASE_*` の4つを `${{ vars.… }}` から渡す。GitHub の Variables への登録はユーザーの手作業として README に書く。`dev` 向けの PR で CI が通ることを確認する
- [x] 6.3 README を書き換える。「データの保存とバックアップ」を、データは Firestore の共有データにあり、どの端末で開いても同じ内容が出ること、**URL を知っている人は誰でも閲覧・編集・削除できる**こと、定期的にエクスポートしてバックアップすること、無料プラン（Spark）で使い、上限を超えた日は保存できなくなるが課金はされないこと、以前のブラウザのデータの取り込み方（1人だけが取り込む）にする。機能一覧の「リンクはデータのあるブラウザでだけ開ける」を消し、他の端末の変更がすぐ反映されることを足す。「開発」に `.env.local` の作り方を、「GitHub Pages への公開」に Firebase プロジェクトの作成・ルールの反映・Variables の登録の手順を足す。手順どおりに `npm run dev` が起動することを確認する

## 7. 確認

- [ ] 7.1 `npm test`、`npm run typecheck`、`npm run build` が通ることを確認する。公開後の URL を2台の端末（PC とスマートフォンなど）で開き、片方での変更がもう片方に出ること、以前のデータを持つブラウザで帯が出て取り込めること、取り込んだ後にもう片方の端末にその内容が出ることを確認する
