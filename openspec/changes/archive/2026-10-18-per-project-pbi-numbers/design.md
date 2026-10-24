# Design

## Context

- `Backlog`（`src/backlog/model.ts`）は version 2 で、次に振る番号 `nextNumber` を全体で1つだけ持つ。`create`（`src/backlog/reducer.ts`）はそれを使って 1 増やす。
- PBI は番号だけで指している。`update` / `delete` / `move` の action は `number` だけを持ち、`updateItems` は全プロジェクトからその番号の PBI を探す。`findPbi(backlog, number)` も同じ。
- 選択中の PBI は URL ハッシュ `#PBI-3` と同期している（`src/useSelectedPbi.ts`、型は `number | null`）。`useActiveProject` は、ハッシュの PBI が属するプロジェクトを最優先でタブに選ぶ。
- 共有データは Firestore の1件の文書の `json` 文字列で、読むときも、トランザクションで操作を適用するときも（`nextBacklog`、`src/backlog/remote.ts`）、`parseBacklogJson` → `validateBacklog` を通す。画面の表示は「サーバーの内容 + 保存待ちの action を reducer で重ねたもの」（`useBacklog`）。
- `validateBacklog` は version 1 を version 2 に変換している。番号の重複はプロジェクトをまたいで検出している。
- `firestore.rules` は `json` が文字列であることしか見ていない。

## Goals / Non-Goals

**Goals:**
- 共有データを一度に書き換える移行の手順を作らず、読み込むたびに同じ結果になる変換だけで version 2 から移る。
- 番号の振り直しが、端末・読み込みの時期・保存待ちの action の有無によって変わらないようにする。

**Non-Goals:**
- プロジェクトのキー（`JJA-3` のような接頭辞）を ID に入れること。表示する ID は `PBI-<番号>` のまま。
- リンクにプロジェクトの名前を入れること（下の決定 3）。
- `/createPR` が作るリンクの形式の変更。以前の形式のリンクとして、最初のプロジェクトの PBI を指せるため。

## Decisions

### 1. データ形式を version 3 にし、`nextNumber` を `Project` に移す

```ts
type Project = { id: number; name: string; nextNumber: number; items: Pbi[] };
type Backlog = { version: 3; nextProjectId: number; projects: Project[] };
```

`create` は対象のプロジェクトの `nextNumber` を使って、そのプロジェクトだけの値を 1 増やす。`createProject` と `emptyBacklog` は `nextNumber: 1` で作る。プロジェクトを削除すると、その `nextNumber` も消える（他のプロジェクトに影響しない）。

- 代わりの案: `nextNumber` を持たず、毎回「プロジェクト内の最大番号 + 1」にする。→ 最後の PBI を削除するとその番号が再利用される。spec の「削除した番号は欠番になる」を守れない。採らない。
- 代わりの案: version 2 のまま `Backlog.nextNumber` を `Record<projectId, number>` にする。→ 古い版のコードが同じ version として読んでしまい、通し番号として解釈して壊れる。version を上げる方が安全。

### 2. version 2 の読み込みで振り直す（`validateBacklog` の中で行う）

`validateVersion2` は、検証したあとで version 3 に変換する。

- 最初のプロジェクト: 番号はそのまま。`nextNumber` は、ファイルの `nextNumber` とそのプロジェクトの最大番号 + 1 の大きい方（今の `atLeastNext`）。全体の `nextNumber` を引き継ぐので、このプロジェクトで以前発行した番号は、削除済みのものも含めて再利用しない。
- 2つ目以降: `items` の並び順はそのまま、番号だけを付け替える。対応表は、`items` を `(createdAt, 元の number)` の昇順で並べた写しから作り、1 から振る。`nextNumber` は件数 + 1。
- `createdAt` は ISO 8601 の文字列なので、文字列の比較で並べる。同じ時刻のときは元の番号で決まるので、結果は入力だけで決まる。

version 1 は、今の変換（1つの「マイプロジェクト」、番号と `nextNumber` はそのまま）を version 3 の形で返す。

変換を `validateBacklog` に置くことで、画面の読み込み（`useBacklog` の `onData`）、トランザクション内の適用（`nextBacklog`）、インポート、ローカルの以前のデータの読み込みのすべてが同じ変換を通る。共有データが version 2 のままの間も、どの端末も同じ番号を表示する。保存待ちの action は振り直した後の番号で作られ、トランザクションも同じ振り直しをしてから適用するので、指す PBI はずれない。最初の書き込みで、共有データは version 3 になる。

- 代わりの案: デプロイ時に一度だけ共有データを書き換えるスクリプトを用意する。→ Firestore の管理用の認証と手順が増える。書き換えの前後で開いている端末の扱いも別に考える必要がある。読み込み時の変換なら、どちらも要らない。採らない。

### 3. リンクは `#<プロジェクトの id>/PBI-<番号>`

`/Jisaku-Jira/<プロジェクト名>/PBI-X` の形も検討した（ユーザーの第一希望）。次の理由で、id をハッシュに入れる形にした。

- GitHub Pages は、知らないパスにアプリの `index.html` を返さない。パスで振り分けるには `404.html` で転送する仕組みが要り、Vite の `base` と組み合わせた扱いも増える。
- 名前は変えられる。変えると、それまでのリンクが切れる。
- 名前は重複しうる（spec でも禁止していない）。空白や日本語も URL エンコードが要る。

プロジェクトの id は作成時に決まり、変わらず、重複しない。

### 4. PBI を `{ projectId, number }` で指す

- `model.ts` に `type PbiRef = { projectId: number; number: number }` を足す。`findPbi(backlog, ref)` はそのプロジェクトの中だけを探す。
- `update` / `delete` / `move` の action に `projectId` を足す。`updateItems` は id でプロジェクトを決めてから、その中で番号を探す。
- `BacklogTable` は1つのプロジェクトの行しか描かないので、`onSelect(number)` などの callback は番号のままにする。`App.tsx` が `project.id` を足して action や選択にする。`DetailPanel` の `key` は `${projectId}/${number}` にし、別のプロジェクトの同じ番号に切り替えたときも下書きを捨てる。
- `share.ts` の `pbiUrl(ref, location)` は `#${projectId}/${formatPbiId(number)}` を返す。

### 5. ハッシュの読み取りと、以前の形式の扱い

`useSelectedPbi` が読むハッシュを、次の型にする。

```ts
type SelectedRef = PbiRef | { projectId: 'first'; number: number }; // 'first' は以前の形式 `#PBI-<番号>`
```

- `#<id>/PBI-<n>` → `{ projectId: id, number: n }`。`#PBI-<n>` → `{ projectId: 'first', number: n }`。それ以外の形は `null`。
- `'first'` は、共有データを読むまで最初のプロジェクトが分からないので、`App.tsx` と `useActiveProject` で `backlog.projects[0].id` に置き換えてから `findPbi` する（`resolveRef(backlog, ref)` を `model.ts` に置く）。
- 以前の形式のハッシュで開いたあとも、ハッシュは書き換えない。一覧で PBI を選び直したときに新しい形式になる。開いただけで URL が変わると、履歴やブックマークとの対応が分かりにくくなるため。
- `select(ref)` は常に新しい形式で書く。

### 6. 検証の重複チェックをプロジェクトの中だけにする

`validateItems` に渡す `seen` を、プロジェクトごとに新しくする。version 3 の `nextNumber` も、プロジェクトごとに `atLeastNext`（そのプロジェクトの最大番号 + 1 以上）で直す。version 2 の検証では、振り直す前に、今までどおり全体で番号の重複を確かめる。全体で重複していると、最初のプロジェクトの番号の扱いが決まらないため。

## Risks / Trade-offs

- [デプロイ前から開いている古い版のタブは、version 3 を「対応していないデータ形式」として読めない] → 古い版は読めない内容の上に書かない（今の仕組みのまま）ので、データは壊れない。画面には読み込みエラーが出るので、再読み込みすれば新しい版になる。ただし、そのエラー画面で「空で始める」を選ぶと上書きされる。個人開発で、開いている端末は限られるので、デプロイ後に再読み込みすることで対処する。
- [以前の形式のリンク `#PBI-<番号>` で、2つ目以降のプロジェクトの PBI を指していたもの（例: Yarikuri の `#PBI-10`）は、別の PBI を開くか、何も開かない] → 振り直すのは2つ目以降のプロジェクトだけで、今ある外部のリンク（PR・ブランチ名）は Jisaku-Jira-App のものだけなので、影響は小さい。
- [Yarikuri の `PBI-10` が `PBI-1` に変わるので、それまでの呼び方と合わなくなる] → ユーザーが求めた振り直しの結果。release のときに伝える。
- [振り直しの規則が `createdAt` に依存するので、手で編集したファイルの `createdAt` が不正な文字列でも、文字列として並べるだけになる] → 検証は今までどおり文字列であることだけを確かめる。順番が多少ずれても番号の重複は起きない。
- [最初のプロジェクトの「最初」はタブの順序で決まる。デプロイ前に誰かがタブを削除して順序が変わっていると、振り直さないプロジェクトが変わる] → デプロイの直前にエクスポートしておけば、意図した結果でなければ戻せる。

## Migration Plan

1. デプロイの前に、本番の画面でエクスポートし、version 2 のファイルを手元に残す。
2. デプロイする。共有データは、最初の書き込みで version 3 になる。それまでは version 2 のまま、読むたびに振り直して表示する。
3. 開いている他の端末を再読み込みする。
4. 戻すとき: 古い版を再デプロイしても、version 3 になった共有データは読めない。古い版を戻したあと、1 のファイルをインポートする（1 以降の変更は失われる）。
