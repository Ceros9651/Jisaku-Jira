# Tasks

## 1. トークンとアイコン

- [ ] 1.1 src/styles/tokens.css の `--gray-*`・`--accent*` の値を design.md の表の値に変え、`--text-xl: 24px` と `--radius-section: 8px` を追加する。`--status-*` の文字色と背景色を新しい灰・青に合わせて調整し、3種のステータス、`--text-muted` の白地と `--surface-sunken` 上で、コントラスト比が 4.5:1 以上あることを開発者ツールで確認する
- [ ] 1.2 index.html の `<head>` に Google Fonts の preconnect（`https://fonts.googleapis.com` と、crossorigin 付きの `https://fonts.gstatic.com`）と、`https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap` の stylesheet を足す。src/styles/tokens.css の `--font-sans` の先頭に `'Inter'` を加え、後ろのシステムフォントの並びは残す。開発者ツールの「Rendered Fonts」で、「PBI-1」や「In Progress」が Inter、和文のタイトルがシステムフォントで描かれていることを確認する。ネットワークを offline にして再読み込みし、システムフォントで崩れずに表示されることも確認する
- [ ] 1.3 src/components/icons.tsx を作り、`aria-hidden` の inline SVG として `PbiTypeIcon`（16px、アクセント色の角丸の四角に白いチェック）、`ChevronDownIcon`、`MoreIcon`（横三点）、`CloseIcon`（DetailPanel の × を移す）、`PlusIcon` を書く。色は `currentColor` かトークンだけを使い、グラデーションと影を付けない

## 2. 上部ナビゲーションとページの見出し

- [ ] 2.1 src/App.tsx のヘッダーを上部ナビゲーションにする。白地・下罫線・高さ 48px・`position: sticky; top: 0`。左に `${import.meta.env.BASE_URL}icon.svg` の 24px のアイコン（`alt=""`）と「Jisaku Jira」、右にエクスポート・インポートを、枠の無い subtle のボタン（hover で `--gray-100` の背景）で置く。読み込み中・接続エラー・読めない共有データの画面でも上部ナビが出ることを、既存の App.test.tsx のエラー画面のテストが通ることで確かめる
- [ ] 2.2 src/App.tsx の `<section role="tabpanel">` をやめ、一覧の上にパンくず（`<nav aria-label="パンくず"><ol>`、「プロジェクト」/「<名前>」に `aria-current="page"`）、`--text-xl` の見出し `h1`、その右の切り替えのボタンと「…」のボタン（3. で作る）、ビューのタブ（`<nav aria-label="ビュー">` の中の「バックログ」に `aria-current="page"`、下端 2px のアクセント色の線、リンクにしない）を置く。見出しの行から件数・SP・ステータス別 SP と「名前を変更」「削除」の文字ボタンを外す
- [ ] 2.3 App.test.tsx に「画面の構成」のテストを追加する。パンくずに「プロジェクト」と選んでいるプロジェクトの名前があり、見出しがその名前で、`aria-current="page"` の「バックログ」がある。接続エラーの画面ではパンくずとビューのタブが無い

## 3. プロジェクトの切り替えメニュー

- [ ] 3.1 src/components/Menu.tsx に WAI-ARIA の Menu Button パターンの部品を作る。ボタン（`aria-haspopup="menu"`、`aria-expanded`）と `role="menu"` のリストで、開くと最初の項目（`aria-checked="true"` の項目があればそれ）にフォーカス、上下の矢印・Home/End で移動、Enter/Space で実行して閉じる、Escape と外側のクリックで閉じてボタンにフォーカスを戻す。`aria-disabled` の項目は実行しない。位置はボタンの下に `position: absolute`、`max-width: min(320px, 100vw - 32px)`、長い名前は折り返す、影は `--shadow-overlay`、角丸 `--radius-panel`
- [ ] 3.2 src/components/ProjectSwitcher.tsx を作る。`ChevronDownIcon` のボタン（`aria-label="プロジェクトを切り替え"`）で、作成順のプロジェクトを `role="menuitemradio"`（選択中に `aria-checked="true"` とチェックの印）、区切り、`role="menuitem"` の「プロジェクトを追加」を並べる。プロジェクトを選ぶと `onSelect(id)`、「プロジェクトを追加」で `onAdd()` を呼ぶ
- [ ] 3.3 src/components/ProjectActionsMenu.tsx を作る。`MoreIcon` のボタン（`aria-label="プロジェクトの操作"`）で、「名前を変更」と「削除」を並べる。プロジェクトが1つのときは「削除」を `aria-disabled="true"` にし、項目の中に「プロジェクトが1つだけのときは削除できません」を小さな muted の文字で出す
- [ ] 3.4 src/App.tsx の `renaming` を `nameEdit: 'rename' | 'create' | null` に変え、'rename' のときは今どおり見出しの位置に `ProjectNameForm`（`size="heading"`、`label="プロジェクト名"`）を、'create' のときは空の `ProjectNameForm`（`label="新しいプロジェクトの名前"`）を出す。作成の確定で今の `createProject` と `switchProject` を呼び、取り消しで見出しに戻して切り替えのボタンにフォーカスを戻す。`switchProject` で `nameEdit` を null にする
- [ ] 3.5 src/components/ProjectTabs.tsx と ProjectTabs.module.css を削除し、`PROJECT_PANEL_ID`・`projectTabId` の利用を App.tsx から外す
- [ ] 3.6 App.test.tsx のプロジェクトのテスト（`getByRole('tab')`、`tablist`、左右の矢印、「プロジェクトを追加」「プロジェクトの名前を変更」「プロジェクトを削除」のボタン）を、specs/projects/spec.md のシナリオに沿って切り替えのメニューと「…」メニューの操作に書き換える。メニューで切り替える、選択中に `aria-checked`、切り替えると詳細パネルとハッシュが消える、キーボード（Enter→下矢印→Enter）で切り替える、Escape で閉じてフォーカスが戻る、メニューからの作成・作成の取り消し、「…」からの名前変更・削除、1つだけのとき削除が `aria-disabled` を含める。`npm test` で通す

## 4. 一覧の区画と行

- [ ] 4.1 src/App.tsx で、未完了の一覧と Done エリアを `.section` の区画にする（`--surface-sunken` の背景、`--radius-section`、内側 8px/12px、区画の間 24px）。区画の見出しの行に、区画名（「バックログ」「Done」、14px 太字の h2）、「n 件の PBI」、「n pt」を左に置き、`data-testid="backlog-summary"`／`done-summary` をこの行に移す。ステータス別 SP のバッジ（`aria-label="ステータス別の SP"` のリスト）は未完了の区画の見出しの行の右端に移す。空の一覧・未完了が無いときの文も区画の中に出す
- [ ] 4.2 src/components/BacklogTable.tsx・module.css で、表を区画の中の白地に 1px の枠と `--radius-control` の角丸で表示し、持ち手の後に種類のアイコンの列（24px、`PbiTypeIcon`）を加える。SP は灰色の小さなバッジ（12px、最小幅 24px、中央揃え）にし、未設定は `aria-hidden` の「-」と `visually-hidden` の「未設定」を出す。`pbi.status === 'done'` の行は ID に取り消し線を引く。mobile 390×844 でタイトル列が潰れないよう、種類のアイコンの列を 560px 以下で 20px に詰める
- [ ] 4.3 src/components/StatusSelect.module.css の `text-transform: uppercase` と `letter-spacing` を消し、矢印の `background-image` を hover 条件なしで常に付ける。高さ 24px、12px/600 にする。BacklogTable の `.statusCol` の幅を「In Progress」と矢印が収まる幅に合わせ直す
- [ ] 4.4 src/components/CreatePbiForm.tsx・module.css を、未完了の区画の表の直後に置く「+ 作成」の行にする。`PlusIcon`、プレースホルダー「作成」、白地、上 1px の罫線、高さ 38px、`position: sticky; bottom: 0`。枠線の「作成」ボタンは入力欄にフォーカスがあるときだけ出す。src/App.tsx で作成欄を区画の末尾に移す
- [ ] 4.5 App.test.tsx の集計のテストの期待値を「3 件の PBI8 pt」の形に直し、specs/pbi-backlog/spec.md の「区画の見出し」「SP が未設定の行」「作った PBI は作成欄の上に並ぶ」のテストを追加する。Done の行の ID の取り消し線は、Done の表の行に取り消し線のクラスが付き、未完了の表の行には付かないことで確かめる

## 5. 詳細パネル

- [ ] 5.1 src/App.module.css の `.withPanel` を、左の列だけ左右 24px の余白、右の列を余白無しで画面右端に接する2列（`minmax(0, 1fr) minmax(360px, 440px)`）にする。src/components/DetailPanel.module.css の `.panel` を `position: sticky; top: 48px; height: calc(100vh - 48px); overflow-y: auto; border-left: 1px solid var(--border)` にし、角丸と四辺の枠をやめる。760px 以下では一覧の下に `position: static`・高さ自動で置く。desktop 1440×900 で、パネルが右端と画面下端に接し、一覧をスクロールしても動かないことを確認する
- [ ] 5.2 src/components/DetailPanel.tsx の先頭の行を `PbiTypeIcon` 付きの ID と閉じるボタン（`CloseIcon`）にし、その下にタイトル（`--text-xl`/700、枠は hover・focus のときだけ）、続けてステータスのラベル（読み上げ用のラベル「ステータス」は残す）を置く。その下に「説明」「受入条件」を 14px 太字の小見出しと入力欄の組にし、最後に「詳細」の小見出しの区画（1px の枠と `--radius-panel`）の中にストーリーポイントを「ラベル左・値右」の行で置く。保存・削除の行は今の振る舞いのまま末尾に置く。`getByLabelText('タイトル')`・`'ステータス'`・`'ストーリーポイント'`・`'説明'`・`'受入条件'` で引ける状態を保つ
- [ ] 5.3 App.test.tsx に、詳細パネルの見出しの順（ID と閉じるボタン、タイトル、ステータス、「説明」「受入条件」「詳細」）を確かめるテストを追加して通す

## 6. デザイン方針の改訂

- [ ] 6.1 docs/design-principles.md の「例外」の節に、design.md の 9. の4項目を `（jira-like-ui）` 付きで追記する
- [ ] 6.2 docs/design-principles.md の本文で置き換わるルールを書き換える：プロジェクトの切り替え（文字だけのタブ→見出し横のメニュー）、プロジェクトへの操作（文字ボタン→「…」メニュー）、ステータス（大文字・hover 時の矢印→大文字にしない・矢印常時）、作成欄（一覧の上→区画の末尾の「+ 作成」の行）、詳細パネルの先頭と配置（箱→右端の全高パネル、小見出しの区画）、Done エリア（箱を使わない→未完了と同じ区画）、集計の位置（見出しの行→区画の見出しの行）、文字サイズ（4段階→24px を加えた5段階）、書体（欧文・数字は Inter、和文はシステムフォント）、色の値（寒色寄り）。各ルールの末尾に `（jira-like-ui）` を付け、絵文字・グラデーション・強い影・中央寄せの禁止は残す

## 7. 確認

- [ ] 7.1 `npm test` と `npm run typecheck` が通ることを確認する
- [ ] 7.2 `npm run dev` で開き、desktop 1440×900・laptop 1280×720・mobile 390×844 で、ユーザーが共有した本家 Jira のスクリーンショットと並べて、上部ナビ・パンくず・見出し・ビューのタブ・区画・行・ステータス・SP バッジ・右端の詳細パネルの配置が対応していることを確認する。PBI 25 件で作成欄が画面下端に残ること、キーボードだけでプロジェクトの切り替え・作成・名前変更・削除ができることも確認する
- [ ] 7.3 （ユーザーが実行）`/ui-review --verify jira-like-ui` で Before/After を確認する。実装担当はこのタスクにチェックを付けない
