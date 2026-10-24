# Design

## Context

- PBI の型は src/backlog/model.ts の `Pbi`（`number` / `title` / `description` / `status` / `storyPoints` / 日時）。共有データ（Firestore `backlogs/shared` の `json`）、エクスポートファイル、このブラウザに残った以前のデータは、どれも validate.ts の `validateBacklog` を通して読む。`validateItems` は PBI を既知の項目だけで組み立て直すので、知らない項目は読み込んだ時点で落ちる。
- 共有データへの書き込みは remote.ts の `nextBacklog` が「最新の JSON を検証 → reducer で action を適用 → 丸ごと書き戻す」形で行う。つまり、どの端末の操作でも、その端末のアプリが知っている項目だけで全体が書き直される。
- ステータスは model.ts の `STATUSES` / `STATUS_LABELS` / `isStatus` と StatusSelect（ネイティブの `<select>` を Lozenge に見せる）で扱っている。カテゴリも同じ形に揃える。
- 一覧の列は 持ち手（28px）/ ID（76px）/ タイトル / ステータス / SP / コピー。作成欄は一覧の行と同じ高さの1行で、先頭に `+` の記号がある。詳細パネルのステータスと SP は「ラベル左・値右」の `.meta` の行。
- docs/design-principles.md は「色を使うのはステータス表示だけ」「赤は保存失敗・エラーの表示だけ」「飾りのアイコンは使わない」と定めている。カテゴリのアイコンは色と形で区別することをユーザーと決めたので、例外として追記する。

## Goals / Non-Goals

**Goals:**
- カテゴリを `Status` と同じ作り（型・定数・判定関数・ラベル）で model.ts に置き、検証・reducer・画面・Markdown のすべてがそこを参照する。
- カテゴリの無い既存データを、データ形式の version を上げずに読めるようにする。
- アイコンはライブラリを足さず、16px の格子のインライン SVG で描く。

**Non-Goals:**
- カテゴリでの絞り込み・並べ替え・カテゴリ別の集計。
- カテゴリをユーザーが追加・名前変更できるようにすること（4つに固定）。
- 知らない項目を保ったまま書き戻す仕組み（古いアプリが新しい項目を消さないようにする前方互換）。下の Risks を参照。

## Decisions

### データ: `category` を必須の項目にし、読み込み時に既定値を入れる

```ts
type Category = 'task' | 'bug' | 'test' | 'security';
const CATEGORIES: readonly Category[] = ['task', 'bug', 'test', 'security'];
const CATEGORY_LABELS: Record<Category, string> = { task: 'タスク', bug: 'バグ', test: 'テスト', security: 'セキュリティ' };
const DEFAULT_CATEGORY: Category = 'task';
type Pbi = { ...; category: Category; ... };
```

- 保存する値は英字のキーにし、画面と Markdown の表記は `CATEGORY_LABELS` から引く（ステータスと同じ）。表記を変えても保存データが変わらない。
- `Pbi.category` は省略可能にせず必須にする。`undefined` を画面や Markdown の各所で扱わずに済むよう、既定値は読み込みの1か所（`validateItems`）で入れる。
- `validateItems`: `raw.category` が `undefined` なら `DEFAULT_CATEGORY`、`isCategory` を通らなければ「`<label>`の category が不正です」で失敗。version 1 も同じ `validateItems` を通るので、変換の追加はいらない。
- version は 2 のまま。項目が増えるだけで既存データはすべて読めるため、version を上げると旧形式の分岐が増えるだけになる（案: version 3 にする → 採らない）。

### reducer

- `create` に `category?: Category` を足し、省略時は `DEFAULT_CATEGORY`。`isCategory` を通らなければ、不正なストーリーポイントと同じく無視して元の状態を返す。
- `PbiChanges` に `category` を足し、`applyChanges` で `isCategory` を確かめる。
- remote.ts の `nextBacklog` は action をそのまま reducer に渡すので変更しない。

### 一覧のアイコン: CategoryIcon コンポーネント

- 新しい src/components/CategoryIcon.tsx。16×16 の SVG で、角丸 2px のカテゴリ色の四角に白い記号を1つ置く（Jira の課題タイプのアイコンと同じ作り）。記号はカテゴリごとに形を変え、色を見分けられなくても区別できるようにする。

  | カテゴリ | 地の色（トークン） | 白い記号 |
  |---|---|---|
  | タスク | `--category-task`（青） | チェックマーク |
  | バグ | `--category-bug`（赤） | 塗りつぶした丸 |
  | テスト | `--category-test`（紫） | 三角（フラスコの形） |
  | セキュリティ | `--category-security`（橙） | 錠前（四角の本体と上の弧） |

  色は tokens.css に足し、白い記号との対比が 3:1 以上（非文字の UI 部品の基準）になる濃さにする。アクセント色・ステータスの色・エラーの赤（`--danger`）とは別の値にし、タスクの青もアクセント色と同じ値は使わない（選択中の行の `--accent-subtle` の上でも区別できるように、また「アクセント色の使い道」を増やさないため）。
- 記号の線と端は整数ピクセルに合わせる（アプリのアイコンと同じ描き方）。
- 読み上げとツールチップ: `<svg role="img" aria-label="バグ">` に `<title>バグ</title>` を入れる。`title` 属性の代わりに SVG の `<title>` を使い、hover の表示と読み上げ名を1つにする。
- 一覧の列: 持ち手と ID のあいだに 24px の `.categoryCol` を足す。見出しのセルは `visually-hidden` の「カテゴリ」にする（持ち手・コピーの列と同じ扱い）。ID の列は左の余白を詰め、アイコンと ID が1つのまとまりに見えるようにする。モバイル（560px 以下）でも列は残し、幅は 20px にする。

### 選択: CategorySelect コンポーネント

- 新しい src/components/CategorySelect.tsx。ネイティブの `<select>`（4つの選択肢、空の選択肢なし）の左に、選んでいるカテゴリの CategoryIcon を置く。ネイティブの選択肢の中には SVG を出せないため、アイコンは選択肢の外の1つだけにする（案: 独自のリストボックスを作る → キーボード操作と読み上げを自前で作ることになるので採らない）。
- `<select>` は枠の無い文字だけにし、矢印は StatusSelect と同じく hover・focus のときだけ出す。読み上げ名は呼び出し側が渡す（作成欄は「新しい PBI のカテゴリ」、詳細パネルは「カテゴリ」）。アイコンは `aria-hidden` にして、読み上げは select の値だけにする（名前の二重読みを避ける）。
- 作成欄: 先頭の `+` の記号を CategorySelect に置き換える。並びは `[アイコン タスク▾] [タイトルの入力] [作成]`。`+` は作成の行であることの目印だったが、入力欄のプレースホルダーと「作成」ボタンで足りるため、記号を増やさない方を採る。CreatePbiForm がカテゴリの状態を持ち、作成後もタイトルだけ空にしてカテゴリは残す。`onCreate` は `(title, category)` を受け取り、App は `create` の action に `category` を渡す。
- 詳細パネル: `.meta` の先頭（ステータスの上）に「カテゴリ」の行を足す。カテゴリはタイトル・説明・SP と同じく下書きに入れ、「保存」で反映する（`dirty` の判定にも含める）。ステータスのように即時反映にしない理由は、仕様のシナリオどおり「変更して保存する」操作にそろえ、保存前に取り消せるようにするため。

### Markdown

- share.ts の `formatPbiMarkdown` で、リンクの行の次に `- カテゴリ: ${CATEGORY_LABELS[pbi.category]}` を足す。PBI の種類が説明より先に分かる位置にする。

### デザイン方針の例外

docs/design-principles.md の「例外」の節に、次を追記する（由来は add-pbi-category）。
- 一覧の ID の左に置くカテゴリのアイコンは、文字の列を足さずに PBI の種類を一目で見分けるためのもので、飾りのアイコンには当たらない。色と形の両方で区別し、カテゴリ名を読み上げとツールチップで示す。
- カテゴリのアイコンの地の色は、ステータス以外で色を使う唯一の例外にする。使うのはカテゴリのアイコンの中だけで、行の背景や文字には使わない。バグの赤はエラーの赤とは別の値にする。

## Risks / Trade-offs

- [この変更の前のアプリを開いたままのタブが操作すると、その端末の `nextBacklog` が全 PBI をカテゴリ無しで書き戻し、全員のカテゴリが `タスク` に戻る] → 個人開発用で開いているタブは限られるため、デプロイ後は開いているタブを再読み込みすることを README の更新内容とあわせて周知する（PR の説明に書く）。前方互換（知らない項目を保つ）は Non-Goals とし、必要になったら別の change で検討する。
- [16px のアイコンは色に頼りがち] → 記号の形を4つとも別にし、色覚の違いでも形で区別できるようにする。実装後に desktop と mobile のスクリーンショットで、選択中の行（`--accent-subtle` の背景）の上でも見分けられることを確かめる。
- [作成欄から `+` が消えると、作成の行だと分かりにくくなる] → プレースホルダー「タイトルを入力して Enter で PBI を作成」と「作成」ボタンは残す。実装後の画面確認で分かりにくければ /ui-review で見直す。

## Migration Plan

- データの移行処理はいらない。カテゴリの無い PBI は読み込み時に `タスク` になり、次の操作で `category` 付きの JSON が共有データに書かれる。
- 戻すとき（この変更を取り消したアプリをデプロイしたとき）は、古いアプリが `category` を読み捨てるだけで、データは読める。カテゴリの値は失われる。
