// 撮影用ブラウザ（Playwright --isolated）の localStorage にだけバックログを入れる。
// 利用者のブラウザのデータには触れない。browser_evaluate で実行し、その後ページを再読み込みする。
() => {
  const now = '2026-10-12T00:00:00.000Z';
  const rows = [
    [3, 'ログイン画面を作る', 'done', 3],
    [1, 'PBI 一覧の API を作る', 'in_progress', 5],
    [4, 'バックログの並べ替えを保存する', 'in_progress', 3],
    [6, 'ストーリーポイントの合計を見出しに出す', 'todo', 2],
    [7, 'PBI の詳細パネルで説明を編集できるようにする', 'todo', 5],
    [8, 'エクスポートしたファイル名に日付を入れる', 'todo', 1],
    [9, 'インポート時に置き換えの確認を出す', 'todo', null],
    [10, '保存に失敗したときに警告を出す', 'todo', 3],
    [11, 'GitHub Pages へのデプロイを自動化する', 'todo', 8],
    [12, 'スプリントを作成できるようにする（とても長いタイトルの例として、一覧での省略表示を確認するために文字数を多くしている）', 'todo', 13],
    [13, 'カンバンボード', 'todo', null],
    [14, 'ダークモード対応', 'todo', 2],
  ];
  const items = rows.map(([number, title, status, storyPoints]) => ({
    number, title, description: '', status, storyPoints, createdAt: now, updatedAt: now,
  }));
  localStorage.setItem('jisaku-jira:backlog', JSON.stringify({ version: 1, nextNumber: 15, items }));
  return items.length;
}
