# Proposal

## Why

今の PBI の番号は、全プロジェクトを通した1つの連番で振られている。そのため、Jisaku-Jira-App に PBI-9 まである状態で Yarikuri に最初の PBI を作ると、`PBI-1` ではなく `PBI-10` になる（PBI-11）。プロジェクトを分けているのに、番号が他のプロジェクトに左右されて読み取りにくい。番号はプロジェクトごとに 1 から振りたい。

## What Changes

- **BREAKING（採番）**: PBI の番号をプロジェクトごとの連番にする。新しいプロジェクトの最初の PBI は `PBI-1` になる。プロジェクトの中では、これまでどおり削除した番号を再利用しない。別々のプロジェクトに同じ番号の PBI があってよい。
- **BREAKING（既存データ）**: 今ある共有データを読み込むときに番号を振り直す。最初のタブのプロジェクト（今の Jisaku-Jira-App）は番号を変えない。2つ目以降のプロジェクトは、PBI を作成日時の順に並べて `PBI-1` から振り直す。並び順・内容は変えない。旧形式（version 1・version 2）のエクスポートファイルを読み込むときも同じように振り直す。
- **BREAKING（リンク）**: 番号だけでは PBI を一意に指せなくなるので、PBI のリンクを `<アプリの URL>#<プロジェクトの id>/PBI-<番号>` にする（例: `…/Jisaku-Jira/#2/PBI-3`）。プロジェクトの名前ではなく、変わらない id を使う。コピーする Markdown のリンクもこの形になる。
- 今までの形式のリンク `#PBI-<番号>` も開ける。この形式は、最初のタブのプロジェクトの PBI を指すものとして扱う。番号を変えない最初のプロジェクトへの、既存の PR やメモのリンクはそのまま使える。
- データ形式を version 3 にする。次に振る番号は、全体の1つではなくプロジェクトごとに持つ。インポートで重複を確かめる範囲を、プロジェクトの中だけにする。

## Capabilities

### New Capabilities

（なし）

### Modified Capabilities

- `pbi-backlog`: 「PBI の ID 採番」を、全プロジェクトの通し番号からプロジェクトごとの連番に変える。
- `pbi-copy`: 「PBI のリンク」の形式をプロジェクトの id を含む形にし、今までの `#PBI-<番号>` の扱いを決める。
- `backlog-storage`: 共有データとエクスポートに、次の番号をプロジェクトごとに持たせる。インポートの重複の確認をプロジェクトの中だけにする。既存のデータと旧形式のファイルを読み込むときの番号の振り直しを加える。
- `backlog-sync`: 「同時操作の扱い」で、番号が重複しないことをプロジェクトの中で保証する形に変える。

## Impact

- データ: `src/backlog/model.ts`（`Backlog` を version 3 に。`nextNumber` を `Project` に移す。`findPbi` をプロジェクトの id と番号で引く）、`src/backlog/validate.ts`（version 3 の検証、version 1・2 からの変換と振り直し）
- 操作: `src/backlog/reducer.ts` の `update` / `delete` / `move` を、番号だけでなくプロジェクトの id でも指すようにする
- 画面と URL: `src/useSelectedPbi.ts`（ハッシュの形式）、`src/useActiveProject.ts`、`src/App.tsx`、`src/components/BacklogTable.tsx`、`src/backlog/share.ts`（リンクの形式）
- 共有データ: Firestore の `backlogs/shared` は形式が変わるだけで、ルール（`firestore.rules`）は変えない。開きっぱなしの古い版のタブは version 3 を読めず、書き込まずに読み込みエラーを出す
- テスト: `src/backlog/*.test.ts`、`src/App.test.tsx` の番号とリンクを確かめているテストの多く
- 対象外: `/createPR` が作るリンク（`#PBI-<番号>`）は、最初のプロジェクトの PBI を指すものとしてそのまま使えるので変えない
