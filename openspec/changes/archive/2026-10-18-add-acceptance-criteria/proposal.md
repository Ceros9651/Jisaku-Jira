# Proposal

## Why

PBI には今タイトルと説明しか書く場所が無く、「何ができたら Done か」を説明に混ぜて書くしかない。受入条件を独立した欄に書けるようにして、詳細パネルで見分けやすくし、コピーで AI に渡すときにも受入条件として伝わるようにする（PBI-6）。

## What Changes

- PBI に「受入条件」の項目を足す。説明と同じ自由記述の複数行テキストで、空でもよい。
- 詳細パネルの「説明」の下に「受入条件」の入力欄を置き、説明と同じく保存ボタンで保存する。
- 一覧のコピーで作る Markdown の末尾に `### 受入条件` の見出しと本文を足す。空なら「（なし）」とする。
- 受入条件を持たない既存の共有データ・エクスポートファイル・以前のデータは、受入条件を空として読み込む。データ形式のバージョン（version 2）は変えない。
- エクスポートするファイルには受入条件も含まれる（既存の「すべての項目を含める」の範囲）。

## Capabilities

### New Capabilities

（なし）

### Modified Capabilities

- `pbi-backlog`: PBI の詳細表示と編集の項目に受入条件を加える。
- `pbi-copy`: コピーする Markdown の形に `### 受入条件` を加える。
- `backlog-storage`: 受入条件を持たない保存データ・ファイルを、受入条件が空の PBI として読み込む要件を加える。

## Impact

- `src/backlog/model.ts`（`Pbi` 型）、`reducer.ts`（作成・更新）、`validate.ts`（読み込みの検証と補完）、`share.ts`（コピーの Markdown）
- `src/components/DetailPanel.tsx` と `DetailPanel.module.css`
- テスト: `reducer.test.ts`、`validate.test.ts`、`share.test.ts`、`App.test.tsx`、テスト用の `src/test/backlog.ts`
- Firestore のルールと共有データの保存形式（JSON 文字列1件）は変えない。依存の追加は無い。
