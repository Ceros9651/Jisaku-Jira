# Design

## Context

- 状態は reducer.ts の純粋関数 `backlogReducer` を useBacklog.ts の `useReducer` で持ち、変わるたびに storage.ts の `saveBacklog` で localStorage の `jisaku-jira:backlog` に丸ごと書いている。読み込みエラーの間は保存しない。
- 保存データ・エクスポートファイルとも validate.ts の `parseBacklogJson` で検証し、version 1 は読み込み時に version 2 へ変換している。
- App.tsx は `useBacklog` の `backlog` / `dispatch` / `loadError` / `saveFailed` / `startEmpty` / `replace` だけを使う。`createProject` の直後は dispatch 前の `backlog.nextProjectId` を新しい id とみなして切り替えている。
- 選択中のプロジェクトは useActiveProject.ts が localStorage の `jisaku-jira:active-project` に覚える。
- DetailPanel は `key={pbi.number}` で、開いた時点の値を下書きとして持つ。保存時は変えた項目だけを `update` で送る。
- サイトは GitHub Pages の静的配信で、`dev` への push で Actions がビルドして公開する。サーバーは無い。
- サインインは設けない（proposal 参照）。

## Goals / Non-Goals

**Goals:**
- reducer を変えずに使い続け、共有データでも各操作が「最新の内容に対して reducer を適用する」形で動くようにする。
- Firestore への依存を1つのモジュールに閉じ込め、テストでは偽物に差し替える。
- 起動・受信のたびに今と同じ検証（`parseBacklogJson`）を通す。

**Non-Goals:**
- PBI やプロジェクトを Firestore の別々のドキュメントに分けること。
- オフラインでの編集と、再接続後の再送。
- Firebase Authentication、App Check。
- 他の人の画面へのカーソルや編集中の表示。

## Decisions

### 共有データは Firestore のドキュメント1件に JSON 文字列で置く

- パス: `backlogs/shared`。フィールド: `json`（`serializeBacklog` の出力）、`updatedAt`（サーバー時刻）。
- 1件にまとめる理由: 今の `Backlog` 型・reducer・検証・エクスポートをそのまま使え、PBI の番号の採番もトランザクション1回で一意にできる。個人〜少人数のバックログならサイズは 1MiB の上限に十分収まる。
- JSON 文字列にする理由: Firestore のマップ・配列に変換すると、読み込み時の検証が二重になる（Firestore の型と `Backlog` の型）。文字列なら保存データ・エクスポートファイルと同じ `parseBacklogJson` で検証でき、壊れたデータの扱いもそのまま使える。
- 採らなかった案:
  - PBI ごとのドキュメント: 並び順・`nextNumber` の管理が別に要り、reducer をそのまま使えない。同時編集の粒度は細かくなるが、今の規模では効果に見合わない。
  - Supabase / GitHub の JSON ファイル: ユーザーが Firestore を選んだ。

### 操作はトランザクションで「最新の内容に reducer を適用」する

```text
apply(action):
  runTransaction:
    current = parse(get(backlogs/shared))  // 無ければ emptyBacklog()、読めなければ中止
    next    = backlogReducer(current, action)
    if next === current: 何もしない
    set(backlogs/shared, { json: serialize(next), updatedAt: serverTimestamp() })
```

- 同時に操作しても、各操作は最新の内容に適用されるため、別々の PBI への変更は両方残り、`create` の番号も重複しない（Firestore がトランザクションを再試行する）。
- `update` は変えた項目だけを持つので、同じ PBI の別の項目の同時変更も両方残る。同じ項目は後のトランザクションの値が残る。
- インポートと「空で始める」は今の `replace` アクションをそのまま通す。
- 採らなかった案: 画面の `backlog` を丸ごと `set` する。後から書いた端末が、相手の変更を知らないまま上書きして消してしまう。

### 画面の状態 = 受信した共有データ + 未確定の操作

useBacklog は次の2つを持つ。

- `server`: `onSnapshot` で最後に受け取って検証した `Backlog`
- `pending`: 送信して、まだトランザクションが終わっていない操作の列

表示する `backlog` は `pending.reduce(backlogReducer, server)`。

- 操作すると `pending` に足して即表示し、トランザクションを始める。成功したら列から外す（そのころには `onSnapshot` で結果が届いている）。失敗したら列から外して `saveFailed` を立てる。表示は `server` に戻る。
- 他の端末の変更で `server` が変わっても、未確定の自分の操作は上に重ねて表示され続けるので、ちらつかない。
- `createProject` の直後に切り替える先は、今までどおり表示中の `backlog.nextProjectId`。同時に別の端末がプロジェクトを作った場合はずれうる（Risks 参照）。
- 自分の書き込みも `onSnapshot` で届くので、`server` を更新する経路は1つだけにする（トランザクションの戻り値では更新しない）。

### Firestore の窓口 `BacklogRemote`

src/backlog/remote.ts にインターフェースと Firestore 実装を置く。

```ts
type RemoteSnapshot = { kind: 'missing' } | { kind: 'text'; text: string };
interface BacklogRemote {
  subscribe(onData: (s: RemoteSnapshot) => void, onError: (message: string) => void): () => void;
  apply(action: BacklogAction): Promise<void>;  // 読めないデータなら reject
}
```

- `useBacklog(remote, storage)` で受け取る。App は `remote` を props で受け取り、main.tsx で Firestore 実装を渡す。テストは src/test/ のメモリ実装（`subscribe` の相手に変更を配る、失敗を注入できる）を渡す。
- 検証は useBacklog 側で `parseBacklogJson` に通す。読めなければ `loadError` にして、その間は `startEmpty` / インポート以外の操作をさせない（今と同じ）。トランザクション側でも同じ検証を行い、読めないデータの上には書かない。
- src/backlog/firebase.ts は `import.meta.env.VITE_FIREBASE_*`（apiKey, authDomain, projectId, appId）から設定を作る。足りなければ Firestore 実装の代わりに、`subscribe` が即「接続先が設定されていません」を返す実装を使う。
- Firestore はメモリキャッシュ（既定）で使う。オフラインでの読み込みはしない。

### 起動時の状態

useBacklog は `status: 'loading' | 'ready' | 'error'` を返す。

- `loading`: 最初の `onSnapshot` を待つ間。App はヘッダーと「読み込み中」だけを出し、タブ・一覧・インポートは出さない。
- `error`: `subscribe` の `onError`（権限・接続・設定なし）。理由と「再読み込み」ボタンを出す。
- `ready` かつ `loadError`: 今の「保存データを読み込めませんでした」の画面の文言を共有データ向けにして使う。
- `missing`（ドキュメントが無い）は `emptyBacklog()` として `ready` にする。最初の操作のトランザクションで作られる。

### このブラウザに残った以前のデータ

- storage.ts の `loadBacklog` を「以前のデータの読み出し」として残し、`saveBacklog` は削除する。`removeLegacyBacklog` を足す。
- App は起動時に一度読み、読み込めたときだけ、一覧の上に帯（既存の `.warning` と同じ形）で「このブラウザに以前のデータ（2 プロジェクト・5 件）が残っています」と「共有データに取り込む」「ファイルに書き出す」「このブラウザから消す」の文字ボタンを出す。
- 「取り込む」はインポートの `pendingImport` と同じ確認ダイアログを使い、ファイル名の代わりに「このブラウザの以前のデータ」と示す。`replace` のトランザクションが成功したら `removeLegacyBacklog` して帯を消す。失敗したら消さない。
- 読み込めない以前のデータは帯を出さず、キーも消さない（壊れたデータを勝手に消さない）。
- `jisaku-jira:active-project` は今までどおり localStorage に置く。

### replace の完了を呼び出し側が待てるようにする

`dispatch` は今と同じく戻り値なしにする。以前のデータの取り込みのために、`replace(backlog): Promise<boolean>` は成否を返す。

### Firestore のセキュリティルール

```text
match /databases/{db}/documents {
  match /backlogs/shared {
    allow read: if true;
    allow create, update: if request.resource.data.keys().hasOnly(['json', 'updatedAt'])
                          && request.resource.data.json is string
                          && request.resource.data.json.size() < 900000;
  }
}
```

- その他のパスは既定で拒否する。ドキュメントの `delete` は許さない（`write` だと delete も含むため、`create, update` だけを許す）。
- firestore.rules と firebase.json をリポジトリに置き、`firebase deploy --only firestore:rules` で手元から反映する。CI ではデプロイしない（Firebase の認証情報を Actions に置かないため）。

### 設定値の受け渡し

- `VITE_FIREBASE_API_KEY` / `VITE_FIREBASE_AUTH_DOMAIN` / `VITE_FIREBASE_PROJECT_ID` / `VITE_FIREBASE_APP_ID`。Web の Firebase 設定は公開される前提の値なので、GitHub の Secrets ではなく Variables に置き、deploy.yml の build ステップの `env` で渡す。
- 手元は `.env.local`（.gitignore 済みのパターンを足す）。.env.example に項目名だけ置く。

### UI

docs/design-principles.md に従い、読み込み中・接続エラー・以前のデータの帯は、既存の `.warning` / `.error` / `.loadError` の形と文字ボタンを使う。スピナーや飾りアイコンは足さない。読み込み中は文字「読み込み中…」だけにする。

## Risks / Trade-offs

- [URL を知っている人なら誰でも全データを消せる] → ユーザーが受け入れた。ルールで対象を1件に限り、削除操作は許さない。README で定期的なエクスポートを勧める。必要になったら Authentication と許可リストを足す（別 change）。
- [API キーがビルドに含まれ、他のアプリからも同じ共有データを書ける] → Web の Firebase 設定は秘密ではない。上と同じ扱い。App Check は今回入れない。
- [1件のドキュメントへの書き込みは持続で毎秒1回程度が目安] → 人の操作の頻度なら届かない。並べ替えはドロップ時に1回、詳細の編集は保存時に1回だけ書く。
- [共有データが大きくなると 1MiB に近づく] → ルールで 900KB 未満に限り、超えると保存失敗として表示される。目安として数千件の PBI まで入る。
- [`createProject` 直後に別端末も作ると、切り替え先が相手のプロジェクトになる] → まれで、データは失われない。必要なら action に一時 id を持たせる形に変える。
- [オフラインでは保存できず、操作が取り消される] → 保存失敗を表示する。オフライン編集は Non-Goal。
- [DetailPanel を開いたまま、他の人が同じ PBI を変えると、下書きは古い値のまま] → 保存するのは変えた項目だけなので、変えていない項目は上書きしない。変えた項目は後勝ち（spec のとおり）。
- [無料枠（1日 読み取り 5 万・書き込み 2 万、送信 月 10 GiB）] → 支払い方法を登録しない無料プラン（Spark）で使い、Blaze には上げない。超えても課金されず、その日の読み書きが失敗するだけ（保存失敗の表示になる）。操作1回は読み取り1・書き込み1、購読中の端末ごとに読み取り1なので、少人数なら回数は届かない。変更のたびにバックログの JSON 全体を受け取るため、効くのは送信量で、PBI が数千件になったら PBI ごとのドキュメントへの分割を検討する。

## Migration Plan

1. Firebase プロジェクトを無料プラン（Spark、支払い方法の登録なし）で作り、Firestore を本番モードで有効化する（手作業）。
2. `firebase deploy --only firestore:rules` でルールを反映する。
3. GitHub の Variables に 4 つの値を登録し、`dev` に push して公開する。
4. 以前から使っていたブラウザで開くと以前のデータの帯が出るので、データを持っている人が1人だけ「共有データに取り込む」を選ぶ。他の人は「ファイルに書き出す」で控えを取ってから「このブラウザから消す」。
5. ロールバック: 以前のコミットに戻して公開し直す。以前のデータは取り込むまで localStorage に残っているため、取り込んだブラウザ以外ではそのまま戻る。取り込んだ人は共有データをエクスポートして、古い版にインポートする（version 2 なので、プロジェクト機能のある版なら読める）。
