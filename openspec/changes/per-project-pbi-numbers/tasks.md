# Tasks

型を変えると、グループ 3 が終わるまで `npm run typecheck` は通らない。グループ 1・2 では、そのグループのテストのファイルを `npx vitest run <ファイル>` で確かめる（vitest は型を検査しない）。

## 1. データ形式 version 3 と読み込み時の振り直し

- [ ] 1.1 src/backlog/model.ts を version 3 にする。`Project` に `nextNumber` を足して `Backlog.nextNumber` を消し、`emptyBacklog` の最初のプロジェクトを `nextNumber: 1` にする。`PbiRef = { projectId: number; number: number }` を足し、`findPbi(backlog, ref)` をそのプロジェクトの中だけで探す形に変える。以前の形式のハッシュ用に `{ projectId: 'first'; number }` を受け、`'first'` を `backlog.projects[0].id` に直す `resolveRef` を足す。`formatPbiId` / `parsePbiId` はそのまま残す。src/test/backlog.ts の `backlogOf` を version 3 にし、各プロジェクトの `nextNumber` をそのプロジェクトの最大番号 + 1 にする
- [ ] 1.2 src/backlog/validate.ts に version 3 の検証を足す。番号の重複はプロジェクトの中だけで確かめ、`nextNumber` はプロジェクトごとに `atLeastNext` で直す。version 1 は「マイプロジェクト」1つの version 3（番号と `nextNumber` はそのまま）に変換する。version 3 は保存時の `serializeBacklog`（src/backlog/storage.ts）の出力としてもそのまま読めることを確かめる
- [ ] 1.3 src/backlog/validate.ts の version 2 を、検証したあとで version 3 に変換する。全体で番号が重複していれば今までどおり失敗にする。最初のプロジェクトは番号を変えずに `nextNumber` を全体の `nextNumber`（`atLeastNext`）にする。2つ目以降は `items` の並びのまま、`(createdAt, 元の番号)` の昇順で 1 から振り直し、`nextNumber` を件数 + 1 にする
- [ ] 1.4 src/backlog/validate.test.ts に次のテストを足し、既存のテストを version 3 に合わせて、`npx vitest run src/backlog/validate.test.ts src/backlog/storage.test.ts src/backlog/transfer.test.ts` で通ることを確かめる。spec の「通し番号の旧形式のファイルをインポートする」（Jisaku-Jira-App の 1〜9・11 はそのまま次は 13、Yarikuri の 10・12 が 1・2 で次は 3）、作成日時が同じときに元の番号の順になること、並び順が変わらないこと、同じ入力から何度変換しても同じ結果になること、version 3 で「別々のプロジェクトに同じ番号がある」は読めて「1つのプロジェクトの中で重複」は失敗すること、version 1 の変換

## 2. 操作をプロジェクトの id と番号で指す

- [ ] 2.1 src/backlog/reducer.ts の `create` を、対象のプロジェクトの `nextNumber` で番号を振ってそのプロジェクトの値だけを 1 増やす形にする。`createProject` は `nextNumber: 1` で作る。`update` / `delete` / `move` の action に `projectId` を足し、`updateItems` は id でプロジェクトを決めてからその中で番号を探す。無いプロジェクトの id や番号は今までどおり無視する
- [ ] 2.2 src/backlog/reducer.test.ts を新しい action の形に合わせ、spec の「プロジェクトごとに 1 から振る」「他のプロジェクトの作成は番号に影響しない」「新しく作ったプロジェクトも 1 から」「削除したプロジェクトは他のプロジェクトの番号に影響しない」「削除した番号は欠番になる」と、2つのプロジェクトに同じ番号があるとき `update` / `delete` / `move` が指定したプロジェクトの PBI だけを変えるテストを足す。`npx vitest run src/backlog/reducer.test.ts` で通ることを確かめる
- [ ] 2.3 src/backlog/remote.test.ts と src/backlog/useBacklog.test.ts を新しい action の形に合わせる。version 2 の共有データの上に `create` を適用すると、振り直した後の番号で作られ、結果が version 3 で保存されるテスト（spec の「振り直したあとに作成する」）と、同じプロジェクトで2件続けて `create` を適用すると番号が重ならないテスト（spec の「同時に PBI を作成する」）を足す。`npx vitest run src/backlog` で通ることを確かめる

## 3. リンクと選択をプロジェクトつきにする

- [ ] 3.1 src/backlog/share.ts の `pbiUrl` を `PbiRef` を受けて `#<projectId>/PBI-<番号>` を返す形にする。src/backlog/share.test.ts を spec の「すべての項目がある PBI」（`#1/PBI-3`）と「開いているページの URL がリンクになる」（`?reload=1#1/PBI-2` で開いて `#2/PBI-5`）に合わせ、`npx vitest run src/backlog/share.test.ts` で通ることを確かめる
- [ ] 3.2 src/useSelectedPbi.ts のハッシュの読み取りを、`#<id>/PBI-<n>` → `PbiRef`、`#PBI-<n>` → `{ projectId: 'first', number }`、それ以外 → `null` にする（`decodeURIComponent` は今までどおり）。`select(ref)` は常に `#<id>/PBI-<n>` で書く。以前の形式で開いたときはハッシュを書き換えない
- [ ] 3.3 src/useActiveProject.ts と src/App.tsx を、選択を `resolveRef` で `PbiRef` に直してから `findPbi` する形に変える。`changeStatus`・並べ替え・詳細パネルの保存・削除の dispatch に `project.id` を足す。`BacklogTable` の callback は番号のままにし、`App.tsx` で `{ projectId: project.id, number }` にして `select` する。`DetailPanel` の `key` を `${projectId}/${number}` にする。src/components/BacklogTable.tsx のコピーで `pbiUrl` に `projectId` を渡す（props に足す）。`npm run typecheck` が通ることを確かめる
- [ ] 3.4 src/App.test.tsx を、選択したときのハッシュの期待値（`#PBI-2` → `#1/PBI-2` など）と新しいデータ形式に合わせる。spec の「リンクで PBI を開く」「同じ番号の PBI が別のプロジェクトにある」「別のプロジェクトの PBI のリンク」「名前を変えたプロジェクトのリンク」「一覧で PBI を選ぶとハッシュが変わる」「無い PBI のリンク」「無いプロジェクトのリンク」「以前の形式のリンク」「以前の形式のリンクで最初のプロジェクトに無い番号」と、「Yarikuri」で作成すると `PBI-1` になる（spec の「プロジェクトごとに 1 から振る」）、version 2 の共有データで開くと2つ目のプロジェクトが振り直されて表示される（spec の「通し番号の共有データで開く」）、別々のプロジェクトの同じ番号の PBI を切り替えると詳細パネルの内容が切り替わる、のテストを足す。`npm test` が通ることを確かめる

## 4. 説明の更新

- [ ] 4.1 README.md の採番の説明（9 行目）を「番号はプロジェクトごとの連番で、削除した番号は再利用しない」に、リンクの説明（12 行目）を `#2/PBI-3` の形と、以前の `#PBI-3` は最初のタブのプロジェクトを指すことに直す。書いた URL の例を dev サーバーで開き、説明どおりの PBI が開くことを確かめる

## 5. 確認

- [ ] 5.1 `npm test` と `npm run build` が通ることを確かめる
- [ ] 5.2 dev サーバーで、プロジェクト「Jisaku-Jira-App」（PBI 1〜9）と「Yarikuri」（PBI 10）を含む version 2 のファイルをインポートする。Jisaku-Jira-App の番号が変わらないこと、Yarikuri が `PBI-1` になること、Yarikuri で作成すると `PBI-2` になること、コピーしたリンクが `#<id>/PBI-<n>` の形で、それを新しいタブで開くと同じ PBI が開くことを確かめる
- [ ] 5.3 デプロイの前に、本番の画面でエクスポートして version 2 のファイルを残す（design.md の Migration Plan）。これはユーザーが行う手順として、作業の終わりに伝える
