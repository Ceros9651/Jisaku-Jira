# Proposal

## Why

PBI をそのまま AI（チャット）に渡して、実装や分解の相談をしたい。いまは PBI を開いて、タイトルや説明を1つずつ手で選んでコピーするしかない。

PBI を開くと URL が `#PBI-3` になり、そのリンクで直接開ける。ただしデータはブラウザの localStorage にしかなく、画面は JavaScript で描くため、URL だけを AI に渡しても AI は PBI の中身を読めない。そこで、リンクと PBI の内容を1回でまとめてコピーできるようにする。

## What Changes

- 一覧の各行の右端（SP 列の右）に「コピー」ボタンを置く。押すと、その PBI のリンクと内容を Markdown にまとめてクリップボードへコピーする。
- コピーする Markdown には、ID とタイトルの見出し、その PBI を開くリンク（公開先の URL ＋ `#PBI-<番号>`）、ステータス、ストーリーポイント、説明を入れる。AI のチャットに貼るだけで内容が伝わり、人はリンクから元の PBI に戻れる。
- コピーできたら、ボタンの文字を短い間「コピー済み」に変え、読み上げでも知らせる。コピーに失敗したら（クリップボードが使えない環境など）、失敗したことを表示する。
- ボタンを押しても PBI は選択されず、詳細パネルも開かない。
- 既存の `#PBI-<番号>` のリンク（開くとその PBI の詳細パネルが開く）は README に書かれているだけで仕様に無いので、この change で仕様にする。リンクの形は変えない。
- PBI の内容を URL に埋め込んで他のブラウザで開けるようにする「共有リンク」は作らない（AI の URL 取得は多くが JavaScript を実行せず、読めないため）。

## Capabilities

### New Capabilities

- `pbi-copy`: PBI を指すリンク（`#PBI-<番号>`）と、一覧から PBI のリンクと内容を Markdown でクリップボードにコピーする機能

### Modified Capabilities

（なし）`pbi-backlog` の「バックログ一覧の表示」は各行に ID・タイトル・ステータス・SP を表示することを求めているだけで、列を足しても矛盾しないため変更しない。

## Impact

- 変えるファイル:
  - src/backlog/ に、PBI を Markdown に整える関数と、PBI のリンクを作る関数を追加する（新規ファイル）
  - src/components/BacklogTable.tsx と BacklogTable.module.css（コピー列とボタン）
- 依存: 追加しない。ブラウザの `navigator.clipboard.writeText` を使う。GitHub Pages（https）と localhost では使える。
- テスト: 新しい関数の単体テストと、App.test.tsx に一覧からコピーするテストを足す。既存のテストは、行の `cell` の位置（ID が 2 列目、SP が 5 列目）を変えないので、そのまま通る想定。
- docs: README にコピーの使い方を1行足す。
