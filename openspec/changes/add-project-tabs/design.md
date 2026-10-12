# Design

## Context

- データは src/backlog/model.ts の `Backlog`（`version: 1`, `nextNumber`, `items: Pbi[]`）1つで、localStorage の `jisaku-jira:backlog` に丸ごと保存している。エクスポートファイルも同じ形で、保存データとファイルの検証は validate.ts の `validateBacklog` を共用している。
- 状態は reducer.ts の `backlogReducer` を useBacklog.ts の `useReducer` で持ち、変わるたびに `saveBacklog` する。読み込みエラーの間は保存しない。
- 選択中の PBI は useSelectedPbi.ts が URL ハッシュ `#PBI-3` と同期している。App は `backlog.items` から選択中の PBI を探す。
- BacklogTable は `items: Pbi[]` を受け取るだけで、データ全体の形を知らない。表示する配列を差し替えればそのまま使える。
- 見た目は docs/design-principles.md に従う（アクセント色は1色で選択状態などに限る、角丸カード・飾りアイコンを使わない、罫線と明度差で区切る）。

## Goals / Non-Goals

**Goals:**
- データ形式を version 2 にし、version 1 の保存データとファイルを読み込み時に変換する。変換は検証と同じ場所で行い、保存データとインポートの両方に効かせる。
- PBI の番号を全プロジェクトで一意に保ち、PBI の操作（更新・削除・並べ替え）を番号だけで指せるようにする。
- BacklogTable、DetailPanel、CreatePbiForm、ConfirmDialog は変えずに使う。

**Non-Goals:**
- プロジェクトの並べ替え、PBI のプロジェクト間の移動。
- URL でプロジェクトを指すこと（`#project=…` など）。プロジェクトはタブと記憶で選び、リンクは PBI だけを指す。
- version 2 から version 1 への書き出し（古いアプリに戻す手段）。

## Decisions

### データ形式 version 2

```ts
type Project = { id: number; name: string; items: Pbi[] };
type Backlog = {
  version: 2;
  nextNumber: number;        // PBI の番号。全プロジェクト共通
  nextProjectId: number;     // プロジェクトの内部 ID。削除しても減らさない
  projects: Project[];       // 配列の順序がタブの順序。1つ以上
};
```

- プロジェクトの識別は名前ではなく内部の数値 `id` にする。名前は変えられ、重複も許すため。
- PBI はプロジェクトの `items` に入れる（PBI に `projectId` を持たせて1本の配列にする案は採らない）。並び順がプロジェクトごとに独立するので、`move` の範囲がそのままプロジェクト内になり、一覧の配列もそのまま BacklogTable に渡せる。
- `emptyBacklog()` は「マイプロジェクト」（id 1）を1つ持ち、`nextProjectId: 2` を返す。
- 型名 `Backlog` は変えない（storage・transfer・useBacklog の呼び出し側をそのまま使うため）。

### version 1 の変換は validate.ts で行う

`validateBacklog` で `version` を見て分岐する。

- `version: 1`: 今の検証をそのまま行い、`{ version: 2, nextNumber, nextProjectId: 2, projects: [{ id: 1, name: 'マイプロジェクト', items }] }` を返す。
- `version: 2`: `projects` が1つ以上の配列であること、各プロジェクトの `id` が重複しない正の整数、`name` が空でない文字列、`items` が今と同じ PBI の検証を通ることを確かめる。PBI の番号の重複はプロジェクトをまたいで検出する。`nextNumber` と `nextProjectId` は、今と同じく既存の最大値＋1 以上に引き上げる。
- それ以外の version は今と同じく「対応していないデータ形式です」。

保存データは読み込んだ時点で version 2 の値になっているため、useBacklog の起動直後の保存で自動的に version 2 に書き直される（追加の移行処理はいらない）。

### reducer の操作

- `create` に `projectId` を足す。無いプロジェクトなら無視する。番号は今と同じく `nextNumber` から振る。
- `update` / `delete` / `move` は番号のままにし、その番号を持つプロジェクトを探して、そのプロジェクトの `items` だけを変える。番号は全体で一意なので、プロジェクトを引数に足さなくてよい。
- `createProject { name }`: 名前を `normalizeTitle` と同じ規則で整え、空なら無視。`id = nextProjectId` で末尾に足す。App は dispatch 前の `backlog.nextProjectId` を新しいプロジェクトの id として切り替えに使う。
- `renameProject { id, name }`、`deleteProject { id }`: 空の名前・無い id・最後の1つの削除は無視して元の状態を返す（今の reducer と同じ方針）。
- 利用者向けのエラー文（「プロジェクト名を入力してください」）は model.ts に定数として置き、呼び出し側で表示する。

### 選択中のプロジェクトの決め方

App の中で次の順に決める（状態としては「最後に選んだ id」だけを持つ）。

1. ハッシュの PBI が見つかれば、その PBI を持つプロジェクト
2. 最後に選んだ id のプロジェクトがあれば、それ
3. 最初のプロジェクト

ハッシュから決まったときも「最後に選んだ id」をそのプロジェクトに更新し、詳細パネルを閉じた後も同じタブに留まるようにする。

「最後に選んだ id」は、バックログとは別のキー `jisaku-jira:active-project` に数値で保存する。バックログのデータに入れない理由は、タブを切り替えただけでデータ（とエクスポートファイル）が変わらないようにするため。読み書きの失敗は無視する（記憶できないだけで、最初のプロジェクトを表示する）。小さな関数 `loadActiveProject` / `saveActiveProject` を storage.ts に足し、それを使う `useActiveProject` フックを src/ に置く。

タブを押したら、`select(null)` で詳細パネルを閉じてから切り替える。プロジェクトを削除したら、左隣（無ければ右隣）の id に切り替える。インポートしたら最初のプロジェクトにする。

### タブの見た目と操作（ProjectTabs）

- ヘッダーの直下に、ヘッダーと同じ背景（`--surface-sunken`）の帯として置き、下端を 1px の罫線にする。タブは文字だけで、箱や角丸で包まない。選択中のタブは文字を本文色・太字にし、下端に 2px のアクセント色の線を引く（アクセント色の用途「選択中の状態」に当たる）。他のタブは `--gray-700`、hover で本文色。
- WAI-ARIA の tabs パターンに従う。`role="tablist"` と `role="tab"`、`aria-selected`、選択中だけ `tabIndex=0`。左右の矢印・Home・End でフォーカスと選択を同時に移す（タブを押したときと同じ切り替え）。一覧の領域は `role="tabpanel"` にし、`aria-labelledby` で選択中のタブを指す。
- タブの並びは `overflow-x: auto` にして、収まらないときは帯の中だけ横にスクロールさせる。
- 末尾に文字のボタン「プロジェクトを追加」を置く（`+` の記号やアイコンは使わない）。押すとその場所が名前の入力欄に変わり、Enter で作成、Escape か空のまま focus を外すと取り消す。空で Enter のときは入力欄の下にエラー文を出す（CreatePbiForm と同じ `role="alert"`）。
- 名前変更と削除は、選択中のプロジェクトに対する操作として、一覧の見出しの行（h1 にプロジェクト名、その右に集計）の右端に文字のボタン「名前を変更」「削除」で置く。行の操作のコピーと同じく muted の文字ボタンにする。名前変更は見出しの位置で入力欄に変わり、Enter で確定・Escape で取り消す。プロジェクトが1つのときは「削除」を `disabled` にする。削除の確認は既存の ConfirmDialog を `danger` で使い、「『Tool』と PBI 3 件を削除します。元に戻せません。」のように名前と件数を出す。
- 見出し h1 は今の「バックログ」からプロジェクト名に変える。`aria-labelledby="backlog-heading"` はそのまま使える。

代替案: 名前変更・削除をタブの右クリックメニューや「…」メニューに入れる → 隠れた操作になり、アイコンも要るので採らない。

### インポートの確認文

`現在のデータ（2 プロジェクト・12 件）を、「file.json」の内容（3 プロジェクト・20 件）で置き換えます。` のようにプロジェクト数と PBI 件数の両方を出す。

## Risks / Trade-offs

- [version 2 に書き直した保存データは、この change より前のアプリで開くと「対応していないデータ形式」になる] → 公開は1つの GitHub Pages だけで、古い版に戻す運用は無い。古い版でも保存データは上書きされない（読み込みエラーの扱い）ので、データは失われない。README に、エクスポートファイルも新しい形式になることを書く。
- [プロジェクトの削除で多くの PBI が一度に消える] → 確認ダイアログに件数を出し、取り消し側にフォーカスする（ConfirmDialog の既存の挙動）。
- [`#PBI-<番号>` のリンクを開くとタブが勝手に切り替わる] → spec どおり。リンクで開いた PBI と一覧が別のプロジェクトになる方が分かりにくいため。
- [テストのデータの組み立てが変わり、既存テストの多くを直す必要がある] → テスト用に「1つのプロジェクトに items を入れた Backlog」を作る小さな関数を用意し、既存テストはそれに置き換えるだけにする。

## Migration Plan

1. 利用者側の作業は無い。新しい版を開くと、保存データ（version 1）が「マイプロジェクト」1つの version 2 に変換され、すぐに保存される。
2. 以前のエクスポートファイル（version 1）もそのままインポートできる。
3. 戻す場合: 新しい版でエクスポートしたファイルは古い版で読めないため、戻す前に古い版向けの変換が必要になる。今回はその手段を作らない（Non-Goals）。
