# Design

## Context

- リポジトリにはアプリのコードがまだない（README、OpenSpec、Claude 用の設定だけ）。土台から作る。
- 公開先は GitHub Pages。静的ファイルしか配信できないので、サーバー側の処理や DB は使えない。データはブラウザ内に置く。
- UI は `CLAUDE.md` の指示により `docs/design-principles.md` に従う必要があるが、このファイルはまだない。`.claude/skills/ui-review/templates/design-principles.md` を元に作り、`anti-patterns.md` の方針を初期ルールとして書く。
- 要件は `specs/pbi-backlog/spec.md` と `specs/backlog-storage/spec.md` を参照。

## Goals / Non-Goals

**Goals:**
- データ操作（採番・並べ替え・検証・保存形式）を UI から切り離した純粋な関数にし、単体テストで仕様のシナリオを確かめられるようにする。
- 1画面（バックログ一覧＋詳細パネル）で完結させ、GitHub Pages のサブパス配信でも壊れないようにする。

**Non-Goals:**
- 複数タブで同時に開いたときの同期（後勝ちでよい。下記リスク参照）。
- 検索・フィルタ、ラベル、担当者、履歴。
- ダークモード。

## Decisions

### 1. Vite + React + TypeScript
静的ビルドが出せて設定が少ない。Next.js の静的エクスポートも候補だったが、サーバー機能を使わないので Vite のほうが単純。テストは Vite と設定を共有できる Vitest と React Testing Library。

### 2. 画面はルーティングなしの1ページ
GitHub Pages は SPA の履歴ルーティングに弱い（直リンクで 404）。一覧と詳細を同じ画面に置き、PBI を選ぶと右側に詳細パネルを開く（Jira のバックログと同じ形）。選択中の PBI は URL ハッシュ（`#PBI-3`）に反映し、リンクで開けるようにする。Vite の `base` はリポジトリ名に合わせて `/Jisaku-Jira/` とする。

### 3. データモデル
```ts
type Status = 'todo' | 'in_progress' | 'done';
type Pbi = {
  number: number;            // 表示 ID は `PBI-${number}`
  title: string;
  description: string;
  status: Status;
  storyPoints: number | null;
  createdAt: string;         // ISO 8601
  updatedAt: string;
};
type Backlog = {
  version: 1;
  nextNumber: number;        // 次に発行する番号。削除しても減らさない
  items: Pbi[];              // 配列の順序がバックログの並び順
};
```
- ID を文字列で持たず番号で持つ。表示形式（`PBI-`）を変えてもデータは変わらない。
- 並び順は配列の順序で表す。個人用で件数が少ない（数百件程度）ので、`rank` などの並べ替え用キーは持たない。
- `nextNumber` を明示的に持つ。「既存の最大番号＋1」で計算すると、最後の PBI を削除したときに番号が再利用されてしまう（欠番の仕様に反する）。

### 4. 状態管理は `useReducer` と純粋な reducer
操作（作成・更新・削除・移動・置き換え）を reducer のアクションにする。採番・検証は reducer 側に置き、UI は結果を表示するだけにする。外部の状態管理ライブラリは、画面が1つなので入れない。

### 5. 永続化
- キー `jisaku-jira:backlog` に `Backlog` を JSON で保存する。`version` を持たせ、将来形式を変えたら読み込み時に移行する。
- 状態が変わるたびに保存する（件数が少ないので差分保存はしない）。書き込みは try/catch し、失敗したら画面上部に警告を出す。
- 読み込みに失敗したら（JSON 不正、検証エラー）「読み込みエラー」状態にし、ユーザーが「空で始める」か「インポート」を選ぶまで保存を止める。これで壊れたデータを黙って上書きしない。
- 検証は自前の関数で行う（項目の型、ステータスの値、番号の重複、ストーリーポイントが 0 以上の整数か）。依存を増やさないため zod などは入れない。
- インポート時、`nextNumber` が既存の最大番号以下なら「最大番号＋1」に補正する。手で編集したファイルでも番号が重複しないようにするため。

### 6. 並べ替えは dnd-kit
`@dnd-kit/sortable` を使う。ポインターとキーボード（フォーカスしてスペースで掴み、矢印で移動）の両方に対応しており、仕様のキーボード操作の要件をそのまま満たせる。HTML5 のドラッグ&ドロップ API を直接使う案は、キーボード対応とタッチ対応を自作することになるので採らない。

### 7. スタイル
素の CSS（CSS Modules）とデザイントークン（CSS 変数）。一覧は表形式で行を 1px の罫線で区切り、カードにしない。色は無彩色を主にし、アクセント色は主ボタン・選択行・フォーカスだけに使う。ステータスは色付きの小さな文字ラベルで示すが、色だけに頼らず文字で区別できるようにする。ID とストーリーポイントは等幅数字（`tabular-nums`）で右揃えまたは桁揃え。

### 8. デプロイ
GitHub Actions（`actions/deploy-pages`）で `main` への push 時にビルドして公開する。

## Risks / Trade-offs

- [ブラウザのデータを消すとバックログも消える] → エクスポート機能を目立つ位置に置く。保存失敗時の警告からもエクスポートへ誘導する。
- [複数タブで同時に編集すると後から保存したタブの内容で上書きされる] → MVP では許容する。`storage` イベントで他タブの変更を検知して再読み込みを促す対応は後続で検討。
- [端末間でデータが共有されない] → JSON のエクスポート／インポートで手動で移す。サーバー保存は後続の変更。
- [配列順で並び順を持つため、件数が非常に多いと保存が重くなる] → 個人用途の件数では問題にならない。

## Migration Plan

新規アプリのため移行対象のデータはない。GitHub リポジトリの Settings → Pages で「GitHub Actions」をソースに設定する必要がある（手作業）。

## Open Questions

- GitHub Pages の公開 URL がリポジトリ名と異なる場合（独自ドメインなど）は `base` を変える。現時点ではリポジトリ名 `Jisaku-Jira` を前提とする。
