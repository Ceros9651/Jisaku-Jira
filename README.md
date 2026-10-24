# Jisaku-Jira

個人開発のスクラムで使う、プロダクトバックログ管理ツール。Jira のバックログ画面の要点だけを持つ。

公開先: <https://ceros9651.github.io/Jisaku-Jira/>

- データは全員で1つを共有する。どの端末・ブラウザで開いても同じバックログが表示され、他の人の変更は再読み込みしなくてもすぐ画面に出る。
- バックログはプロジェクトごとに分かれ、ヘッダーの下のタブで切り替える。タブの末尾の「プロジェクトを追加」で作成し、見出しの行の「名前を変更」「削除」で選択中のプロジェクトを操作する（削除はそのプロジェクトの PBI ごと消える。最後の1つは消せない）。最後に開いていたプロジェクトは、ブラウザごとに覚えている。
- PBI には追加した順に `PBI-1`, `PBI-2`, … の ID が付く。番号は全プロジェクトで通し番号で、削除した番号は再利用しない（欠番になる）。同時に作成しても番号は重ならない。
- 一覧はドラッグ、またはキーボード（持ち手にフォーカスしてスペースで掴み、上下の矢印で移動、スペースで置く）で並べ替えられる。並べ替えても ID は変わらない。
- PBI はステータス（To Do / In Progress / Done）とストーリーポイント（任意、0 以上の整数）を持つ。
- PBI はカテゴリ（タスク / バグ / テスト / セキュリティ）を1つ持ち、一覧では ID の左のアイコンで見分けられる（アイコンに重ねるとカテゴリ名が出る）。カテゴリは作成欄のタイトルの左で選んで作り（直前に選んだカテゴリが残る）、詳細パネルで変えられる。カテゴリの無い以前のデータやファイルの PBI はタスクとして読み込む。
- PBI を選ぶと右側に詳細が開き、URL が `#PBI-3` のようになる。このリンクはどの端末でも開ける（その PBI のプロジェクトに切り替わる）。
- 一覧の右端の「コピー」で、PBI のリンクと内容（タイトル・カテゴリ・ステータス・SP・説明）を Markdown でクリップボードにコピーできる。AI のチャットにそのまま貼って渡す用途。

## データの保存とバックアップ

データは Firebase の Cloud Firestore にある**共有データ1件**に保存される。

- **サインインは無い。アプリの URL を知っている人は誰でも、閲覧・編集・削除・インポートでの置き換えができる。** 知られたくない内容は書かない。
- 同時に操作しても、別々の PBI やプロジェクトへの変更はどちらも残る。同じ PBI の同じ項目を同時に変えたときは、後から保存したほうが残る。
- 接続できないときは保存できず、「変更を保存できませんでした」と出て、その操作は取り消される。オフラインでは編集できない。
- 誤操作やいたずらで消えても元に戻す機能は無いため、ヘッダーの「エクスポート」で JSON ファイルに書き出し、定期的にバックアップすること。
- 「インポート」でそのファイルを読み込むと、共有データ全体を置き換える（確認あり）。他の人の画面の内容も置き換わる。
- エクスポート・インポートは全プロジェクトをまとめて1ファイルで行う。プロジェクトを入れる前の版で書き出したファイルも読み込め、その PBI は「マイプロジェクト」1つに入る。
- Firebase は無料プラン（Spark、支払い方法を登録しない）で使う。少人数なら上限（1日 読み取り 5 万回・書き込み 2 万回など）には届かない。超えても課金はされず、その日は保存できなくなるだけ。

### 以前のブラウザのデータを移す

共有データに移る前の版は、データを各ブラウザの localStorage に保存していた。そのデータが残っているブラウザで開くと、一覧の上に「このブラウザに以前のデータ（…）が残っています。」と出る。

- 「共有データに取り込む」: 共有データ全体を、そのブラウザのデータで置き換える（確認あり）。取り込めたら、そのブラウザのデータは消える。
- 「ファイルに書き出す」: そのブラウザのデータを JSON ファイルにする。共有データは変わらない。
- 「このブラウザから消す」: そのブラウザのデータを消す（確認あり）。共有データは変わらない。

取り込みは置き換えなので、**取り込むのは1人だけ**にする。他の人は「ファイルに書き出す」で控えを取ってから「このブラウザから消す」を選ぶ。複数のブラウザのデータをまとめたいときは、手でどちらかに入れ直してから取り込む。

## 開発

Node.js 24 以上。

Firebase の接続設定を `.env.local` に置く（コミットしない）。[.env.example](.env.example) をコピーして、Firebase コンソールの **プロジェクトの設定 → マイアプリ（ウェブ）** に出る `apiKey` / `authDomain` / `projectId` / `appId` を入れる。

```bash
cp .env.example .env.local   # 値を入れる
```

設定が無いと、画面に「共有データの接続先が設定されていません」と出る。開発用のデータを分けたいときは、本番とは別の Firebase プロジェクトを作ってその値を入れる。

```bash
npm install
npm run dev        # http://localhost:5173/Jisaku-Jira/ で起動
npm test           # テスト（Vitest。Firestore にはつながず、偽の共有データで動く）
npm run typecheck  # 型チェック
npm run build      # dist/ にビルド
npm run preview    # ビルド結果を http://localhost:4173/Jisaku-Jira/ で確認
```

UI を変更するときは [docs/design-principles.md](docs/design-principles.md) に従う。

Claude Code で作業用のブランチに実装したら、`/createPR` で今のブランチから `dev` への PR を作れる（[.claude/skills/createPR/SKILL.md](.claude/skills/createPR/SKILL.md)）。コミット・push・PR の作成の前に、それぞれ内容を見せて確認を取る。前提として `gh auth login` を済ませておく。

## GitHub Pages への公開

`dev` に push すると、GitHub Actions（[.github/workflows/deploy.yml](.github/workflows/deploy.yml)）が型チェック・テスト・ビルドを行い、GitHub Pages に公開する。`dev` 向けの PR では、公開せずにチェックとビルドだけを行う。

初回だけ、次の準備をする。

1. リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にする。
2. [Firebase コンソール](https://console.firebase.google.com/) でプロジェクトを作る。支払い方法は登録せず、無料プラン（Spark）のままにする。Google アナリティクスは不要。
3. **Firestore Database** を作成する。ロケーションは `asia-northeast1`（東京）など近い場所を選び、**本番環境モード**で始める。
4. **プロジェクトの設定 → マイアプリ** で ウェブアプリ（`</>`）を追加し、表示される `firebaseConfig` の値を控える（Hosting は不要）。
5. [firestore.rules](firestore.rules) を反映する。Firebase CLI を使う場合:

   ```bash
   npx firebase-tools login
   npx firebase-tools deploy --only firestore:rules --project <projectId>
   ```

   CLI を使わない場合は、コンソールの **Firestore Database → ルール** に firestore.rules の中身を貼って公開する。ルールは `backlogs/shared` の読み取りと作成・更新だけを許し、削除と他の場所への読み書きを拒否する。
6. GitHub の **Settings → Secrets and variables → Actions → Variables** に、`VITE_FIREBASE_API_KEY` / `VITE_FIREBASE_AUTH_DOMAIN` / `VITE_FIREBASE_PROJECT_ID` / `VITE_FIREBASE_APP_ID` を登録する。Web 用の Firebase 設定はページから誰でも見える値なので、Secrets ではなく Variables に置く。

ルールを変えたときは、5 をやり直す（CI はルールを反映しない）。

公開先は <https://ceros9651.github.io/Jisaku-Jira/>。リポジトリ名を変えたり独自ドメインを使ったりする場合は、[vite.config.ts](vite.config.ts) の `base` を合わせて変える。
