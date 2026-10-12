# Design

## Context

- 選択中の PBI は src/useSelectedPbi.ts が URL ハッシュ（`#PBI-3`）と同期している。起動時と `hashchange` でハッシュを読み、無い番号なら App 側で `selectedPbi` が null になってパネルは開かない。つまり spec の「PBI のリンク」は今の実装のままで満たしている。この change ではテストで固定するだけで、挙動は変えない。
- 一覧は src/components/BacklogTable.tsx の `<table>`。列は 持ち手 / ID / タイトル / ステータス / SP の5つ。App.test.tsx は `getAllByRole('cell')[1]`（ID）と `[4]`（SP）を参照している。
- 行の操作の手がかり（持ち手の色、ステータスの矢印）は「普段は控えめ、行 hover・focus で強める」に揃えている（docs/design-principles.md）。飾りアイコンは使わない。

## Goals / Non-Goals

**Goals:**
- Markdown の組み立てを DOM から切り離した純粋関数にし、spec の例どおりの文字列になることを単体テストで固定する。
- 既存テストの列の位置を壊さない。

**Non-Goals:**
- 詳細パネルへのコピーボタン（今回は一覧だけ）。
- 複数 PBI やバックログ全体のコピー。
- `navigator.clipboard` が使えない古いブラウザ向けの `document.execCommand('copy')` 代替。

## Decisions

### Markdown とリンクは src/backlog/ の純粋関数で作る

`src/backlog/share.ts` に次の2つを置く。

- `pbiUrl(number, location)`: `location.origin + location.pathname + '#PBI-<番号>'`。クエリとハッシュは捨てる（`?reload=1` などの作業用クエリをリンクに残さないため）。`location` を引数にして、テストで任意の URL を渡せるようにする。
- `formatPbiMarkdown(pbi, url)`: spec の形の文字列を返す。改行は `\n`。説明は前後の空白だけを除き、中身はそのまま入れる（`trim()` 後が空なら「（なし）」）。ステータス名は `STATUS_LABELS` を使い、画面の表記と揃える。

代替案: BacklogTable の中で文字列を組み立てる → 形の仕様を単体テストしにくいので採らない。

### ボタンは文字の「コピー」、行の右端の新しい列に置く

SP 列の後ろに6列目 `copyCol` を足す。ID・SP の列位置は変わらないので既存テストはそのまま通る。見出しのセルは `visually-hidden` で「コピー」とする（持ち手の列と同じ扱い）。

見た目は持ち手と同じく、枠も背景も無い 12px の文字ボタンにし、普段は `--gray-500`（`--text-muted`）、行 hover と `:focus-visible` で本文色（`--text`）にして下線を出す。hover だけで表示/非表示を切り替えると、タッチ端末で押せなくなるため、常に表示しておく。

代替案: クリップボードの線画アイコン → 文字で意味が伝わるので、design-principles の「飾りアイコンを使わない」に合わせて文字にする。

### 結果の表示は各行のボタンが持つ状態で切り替える

Row の中に `copyState: 'idle' | 'copied' | 'failed'` を持ち、`navigator.clipboard.writeText` の成功・失敗で切り替え、`setTimeout` で 2000ms 後に `idle` に戻す。アンマウント時と連打時はタイマーをクリアする。

- ボタンの `aria-label` は常に「PBI-3 をコピー」（テストで引く名前を固定するため）。結果の読み上げは、BacklogTable に1つだけ置く `role="status"` の `visually-hidden` 要素に「PBI-3 をコピーしました」「PBI-3 をコピーできませんでした」を入れて行う。
- 「コピー失敗」は赤を使わない。design-principles では赤は保存失敗・読み込みエラー・入力エラーだけに使う決まりで、コピーの失敗は文字だけで伝わる。
- ボタン幅は一番長い「コピー済み」「コピー失敗」に合わせて固定し、文字が変わっても列がずれないようにする。

`navigator.clipboard` が無い環境（http の非 localhost など）では `writeText` を呼べないので、存在チェックをして失敗として扱う。

## Risks / Trade-offs

- [クリップボード API は https か localhost でしか使えない] → GitHub Pages は https、開発は localhost なので実用上は問題ない。使えない環境では「コピー失敗」になる。
- [列が1つ増え、狭い画面でタイトル列が細くなる] → 列幅を 72px 前後に抑え、560px 以下では 56px 程度に詰める。mobile 390×844 で確認する。
- [リンクは同じブラウザでしか中身を開けない] → spec どおり。Markdown に内容を入れているので AI へ渡す目的には足りる。README に「リンクはデータのあるブラウザでだけ開ける」と書く。
