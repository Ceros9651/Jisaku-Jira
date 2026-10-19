import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type Backlog, type Pbi, emptyBacklog } from './backlog/model';
import { ACTIVE_PROJECT_KEY, LEGACY_STORAGE_KEY } from './backlog/storage';
import { renderApp } from './test/app';
import { backlogOf } from './test/backlog';
import { FakeRemote } from './test/remote';

const now = '2026-10-12T00:00:00.000Z';

function pbi(number: number, title: string, storyPoints: number | null = null): Pbi {
  return { number, title, description: '', acceptanceCriteria: '', status: 'todo', storyPoints, createdAt: now, updatedAt: now };
}

/** 「マイプロジェクト」1つに PBI を入れて保存する */
function seed(items: Pbi[], nextNumber = Math.max(0, ...items.map((p) => p.number)) + 1) {
  const backlog = backlogOf(['マイプロジェクト', items]);
  seedBacklog({ ...backlog, projects: [{ ...backlog.projects[0], nextNumber }] });
}

/** 共有データ。テストごとに作り直す */
let remote: FakeRemote;

function seedBacklog(backlog: Backlog) {
  remote = new FakeRemote(backlog);
}

/** 最初のプロジェクトの PBI */
function storedItems(): Pbi[] {
  return stored().projects[0].items;
}

/** 名前で指定した表の行の ID。既定は未完了の一覧 */
function rowTexts(table = '未完了の PBI'): string[] {
  return within(screen.getByRole('table', { name: table }))
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[2].textContent ?? '');
}

/** 共有データに保存された内容 */
function stored(): Backlog {
  const backlog = remote.backlog();
  if (backlog === null) throw new Error('not stored');
  return backlog;
}

beforeEach(() => {
  remote = new FakeRemote();
  window.history.replaceState(null, '', '/');
});

describe('一覧', () => {
  test('ID・タイトル・ステータス・SP を並び順で表示し、件数と合計を見出しに出す', () => {
    seed([pbi(2, 'b', 3), pbi(1, 'a', 5), pbi(4, 'c')]);
    renderApp(remote);
    expect(rowTexts()).toEqual(['PBI-2', 'PBI-1', 'PBI-4']);
    const first = screen.getAllByRole('row')[1];
    expect(within(first).getByRole('button', { name: 'b' })).toBeInTheDocument();
    expect(within(first).getByRole('combobox', { name: 'PBI-2 のステータス' })).toHaveValue('todo');
    expect(within(first).getAllByRole('cell')[5]).toHaveTextContent('3');
    expect(screen.getByTestId('backlog-summary')).toHaveTextContent('3 件の PBI8 pt');
  });

  test('ステータス別の SP は区画ごとに、その区画の PBI だけで数える', () => {
    seed([
      { ...pbi(1, 'a', 3), status: 'done' },
      { ...pbi(2, 'b', 5), status: 'in_progress' },
      pbi(3, 'c', 2),
      pbi(4, 'd'),
    ]);
    renderApp(remote);
    const badges = (section: string) =>
      within(within(screen.getByRole('region', { name: section })).getByRole('list', { name: 'ステータス別の SP' }))
        .getAllByRole('listitem')
        .map((li) => li.textContent);
    expect(screen.getByTestId('backlog-summary')).toHaveTextContent('3 件の PBI7 pt');
    expect(badges('バックログ')).toEqual(['To Do 2', 'In Progress 5']);
    expect(screen.getByTestId('done-summary')).toHaveTextContent('1 件の PBI3 pt');
    expect(badges('Done')).toEqual(['Done 3']);
  });

  test('区画のバッジの合計は、その区画の SP 合計と一致する', () => {
    seed([
      { ...pbi(1, 'a', 3), status: 'done' },
      { ...pbi(2, 'b', 5), status: 'in_progress' },
      pbi(3, 'c', 2),
      { ...pbi(4, 'd', 8), status: 'done' },
      pbi(5, 'e'),
    ]);
    renderApp(remote);
    for (const [section, summary] of [
      ['バックログ', 'backlog-summary'],
      ['Done', 'done-summary'],
    ]) {
      const region = screen.getByRole('region', { name: section });
      const total = within(within(region).getByRole('list', { name: 'ステータス別の SP' }))
        .getAllByRole('listitem')
        .reduce((sum, li) => sum + Number(li.textContent?.match(/\d+$/)?.[0]), 0);
      expect(within(region).getByTestId(summary)).toHaveTextContent(`${total} pt`);
    }
  });

  test('件数と合計は To Do と In Progress だけで数え、他のプロジェクトは含めない', () => {
    seedTwoProjects(
      [pbi(1, 'a', 3), { ...pbi(2, 'b', 5), status: 'in_progress' }, pbi(3, 'c'), { ...pbi(4, 'd', 2), status: 'done' }],
      [pbi(5, 'e', 8)],
    );
    renderApp(remote);
    expect(rowTexts()).toEqual(['PBI-1', 'PBI-2', 'PBI-3']);
    expect(screen.getByTestId('backlog-summary')).toHaveTextContent('3 件の PBI8 pt');
  });

  test('PBI がないときは空状態と作成の操作を表示する', () => {
    renderApp(remote);
    expect(screen.getByText(/PBI はまだありません/)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '新しい PBI のタイトル' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '作成' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Done' })).not.toBeInTheDocument();
  });
});

describe('Done エリア', () => {
  test('Done の PBI は未完了の一覧に出さず、下の Done エリアに件数・合計とともに並べる', () => {
    seedTwoProjects(
      [{ ...pbi(1, 'a', 3), status: 'done' }, pbi(2, 'b'), { ...pbi(3, 'c'), status: 'done' }],
      [{ ...pbi(4, 'd', 5), status: 'done' }],
    );
    renderApp(remote);
    expect(rowTexts()).toEqual(['PBI-2']);
    expect(screen.getByRole('heading', { name: 'Done', level: 2 })).toBeInTheDocument();
    expect(screen.getByTestId('done-summary')).toHaveTextContent('2 件の PBI3 pt');
    expect(rowTexts('Done')).toEqual(['PBI-1', 'PBI-3']);
  });

  test('Done の行には並べ替えの持ち手が無い', () => {
    seed([pbi(1, 'a'), { ...pbi(2, 'b'), status: 'done' }]);
    renderApp(remote);
    expect(screen.getByRole('button', { name: 'PBI-1 を並べ替え' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'PBI-2 を並べ替え' })).not.toBeInTheDocument();
  });

  test('Done の PBI が無いときは Done エリアを出さない', () => {
    seed([pbi(1, 'a'), { ...pbi(2, 'b'), status: 'in_progress' }]);
    renderApp(remote);
    expect(screen.queryByRole('heading', { name: 'Done' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('done-summary')).not.toBeInTheDocument();
    expect(screen.getAllByRole('table')).toHaveLength(1);
  });

  test('すべて Done のときは未完了が無いことを出し、Done エリアにすべて並べる', () => {
    seed([
      { ...pbi(1, 'a', 2), status: 'done' },
      { ...pbi(2, 'b', 3), status: 'done' },
    ]);
    renderApp(remote);
    expect(screen.getByText('未完了の PBI はありません。')).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: '未完了の PBI' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '新しい PBI のタイトル' })).toBeInTheDocument();
    expect(screen.getByTestId('backlog-summary')).toHaveTextContent('0 件の PBI0 pt');
    expect(rowTexts('Done')).toEqual(['PBI-1', 'PBI-2']);
  });

  test('Done エリアの行を選ぶと詳細を開く', async () => {
    const user = userEvent.setup();
    seed([pbi(1, 'a'), { ...pbi(2, 'b'), status: 'done' }]);
    renderApp(remote);
    await user.click(within(screen.getByRole('table', { name: 'Done' })).getByRole('button', { name: 'b' }));
    expect(within(screen.getByRole('complementary')).getByRole('heading', { name: 'PBI-2' })).toBeInTheDocument();
  });

  test('一覧で Done にすると Done エリアに移る', async () => {
    const user = userEvent.setup();
    seed([pbi(1, 'a'), pbi(2, 'b'), pbi(3, 'c')]);
    renderApp(remote);
    await user.selectOptions(screen.getByRole('combobox', { name: 'PBI-2 のステータス' }), 'done');
    expect(rowTexts()).toEqual(['PBI-1', 'PBI-3']);
    expect(rowTexts('Done')).toEqual(['PBI-2']);
    expect(storedItems().map((p) => p.number)).toEqual([1, 2, 3]);
  });

  test('詳細から Done にしても移り、詳細パネルは開いたまま', async () => {
    const user = userEvent.setup();
    seed([pbi(1, 'a'), pbi(2, 'b')]);
    window.history.replaceState(null, '', '/#PBI-2');
    renderApp(remote);
    await user.selectOptions(within(screen.getByRole('complementary')).getByLabelText('ステータス'), 'done');
    expect(rowTexts()).toEqual(['PBI-1']);
    expect(rowTexts('Done')).toEqual(['PBI-2']);
    expect(within(screen.getByRole('complementary')).getByRole('heading', { name: 'PBI-2' })).toBeInTheDocument();
  });

  test('Done から To Do に戻すと、未完了の一覧の元の位置に戻る', async () => {
    const user = userEvent.setup();
    seed([pbi(1, 'a'), { ...pbi(2, 'b'), status: 'done' }, pbi(3, 'c')]);
    renderApp(remote);
    expect(rowTexts()).toEqual(['PBI-1', 'PBI-3']);
    await user.selectOptions(screen.getByRole('combobox', { name: 'PBI-2 のステータス' }), 'todo');
    expect(rowTexts()).toEqual(['PBI-1', 'PBI-2', 'PBI-3']);
    expect(screen.queryByRole('heading', { name: 'Done' })).not.toBeInTheDocument();
    expect(storedItems().map((p) => p.number)).toEqual([1, 2, 3]);
  });
});

describe('作成', () => {
  test('Enter で末尾に PBI-<番号> として追加する', async () => {
    const user = userEvent.setup();
    seed([pbi(1, 'a'), pbi(3, 'c')], 4);
    renderApp(remote);
    await user.type(screen.getByRole('textbox', { name: '新しい PBI のタイトル' }), 'ログイン画面を作る{Enter}');
    expect(rowTexts()).toEqual(['PBI-1', 'PBI-3', 'PBI-4']);
    expect(screen.getByRole('button', { name: 'ログイン画面を作る' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '新しい PBI のタイトル' })).toHaveValue('');
  });

  test('空タイトルではエラーを表示して作成しない', async () => {
    const user = userEvent.setup();
    renderApp(remote);
    await user.type(screen.getByRole('textbox', { name: '新しい PBI のタイトル' }), '   {Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('タイトルを入力してください');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('ステータス', () => {
  test('一覧で変更すると反映され、保存される', async () => {
    const user = userEvent.setup();
    seed([pbi(1, 'a')]);
    renderApp(remote);
    await user.selectOptions(screen.getByRole('combobox', { name: 'PBI-1 のステータス' }), 'in_progress');
    expect(screen.getByRole('combobox', { name: 'PBI-1 のステータス' })).toHaveValue('in_progress');
    expect(storedItems()[0].status).toBe('in_progress');
  });
});

describe('詳細パネル', () => {
  test('行を選ぶと詳細を開き、URL ハッシュに反映する', async () => {
    const user = userEvent.setup();
    seed([pbi(1, 'a'), pbi(2, 'b')]);
    renderApp(remote);
    await user.click(screen.getByRole('button', { name: 'b' }));
    const panel = screen.getByRole('complementary');
    expect(within(panel).getByRole('heading', { name: 'PBI-2' })).toBeInTheDocument();
    expect(within(panel).getByLabelText('タイトル')).toHaveValue('b');
    expect(window.location.hash).toBe('#1/PBI-2');
  });

  test('ハッシュ付きで開くとその PBI が選ばれる', () => {
    seed([pbi(1, 'a'), pbi(3, 'c')]);
    window.history.replaceState(null, '', '/#PBI-3');
    renderApp(remote);
    expect(within(screen.getByRole('complementary')).getByRole('heading', { name: 'PBI-3' })).toBeInTheDocument();
  });

  test('無い PBI のハッシュで開くと一覧だけを表示する', () => {
    seed([pbi(1, 'a'), pbi(3, 'c')]);
    window.history.replaceState(null, '', '/#PBI-9');
    renderApp(remote);
    expect(rowTexts()).toEqual(['PBI-1', 'PBI-3']);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  test('タイトル・説明・SP を編集して保存すると、ID と位置は変わらない', async () => {
    const user = userEvent.setup();
    seed([pbi(1, 'a'), pbi(2, 'b'), pbi(3, 'c')]);
    renderApp(remote);
    await user.click(screen.getByRole('button', { name: 'b' }));
    const panel = screen.getByRole('complementary');
    await user.clear(within(panel).getByLabelText('タイトル'));
    await user.type(within(panel).getByLabelText('タイトル'), '新しいタイトル');
    await user.type(within(panel).getByLabelText('説明'), '詳しい説明');
    await user.type(within(panel).getByLabelText('ストーリーポイント'), '5');
    await user.click(within(panel).getByRole('button', { name: '保存' }));

    expect(rowTexts()).toEqual(['PBI-1', 'PBI-2', 'PBI-3']);
    expect(screen.getByRole('button', { name: '新しいタイトル' })).toBeInTheDocument();
    expect(storedItems()[1]).toMatchObject({ number: 2, title: '新しいタイトル', description: '詳しい説明', storyPoints: 5 });
    expect(screen.getByTestId('backlog-summary')).toHaveTextContent('5 pt');
  });

  test('SP を空にして保存すると未設定に戻る', async () => {
    const user = userEvent.setup();
    seed([pbi(1, 'a', 3)]);
    window.history.replaceState(null, '', '/#PBI-1');
    renderApp(remote);
    const panel = screen.getByRole('complementary');
    await user.clear(within(panel).getByLabelText('ストーリーポイント'));
    await user.click(within(panel).getByRole('button', { name: '保存' }));
    expect(storedItems()[0].storyPoints).toBeNull();
  });

  test.each([
    ['タイトルが空', 'タイトル', '', 'タイトルを入力してください'],
    ['SP が負', 'ストーリーポイント', '-1', 'ストーリーポイントは 0 以上の整数で入力してください'],
    ['SP が小数', 'ストーリーポイント', '2.5', 'ストーリーポイントは 0 以上の整数で入力してください'],
    ['SP が文字', 'ストーリーポイント', 'abc', 'ストーリーポイントは 0 以上の整数で入力してください'],
  ])('%s のときはエラーを表示して保存しない', async (_, field, value, message) => {
    const user = userEvent.setup();
    seed([pbi(1, 'a')]);
    window.history.replaceState(null, '', '/#PBI-1');
    renderApp(remote);
    const panel = screen.getByRole('complementary');
    await user.clear(within(panel).getByLabelText(field));
    if (value) await user.type(within(panel).getByLabelText(field), value);
    await user.click(within(panel).getByRole('button', { name: '保存' }));
    expect(within(panel).getByRole('alert')).toHaveTextContent(message);
    expect(storedItems()[0]).toMatchObject({ title: 'a', storyPoints: null });
  });

  test('受入条件を入力して保存すると反映され、開き直しても残る', async () => {
    const user = userEvent.setup();
    seed([pbi(1, 'a'), pbi(2, 'b')]);
    renderApp(remote);
    await user.click(screen.getByRole('button', { name: 'b' }));
    await user.type(
      within(screen.getByRole('complementary')).getByLabelText('受入条件'),
      '- ログインできる{Enter}- 誤ったパスワードではエラーが出る',
    );
    await user.click(within(screen.getByRole('complementary')).getByRole('button', { name: '保存' }));
    const criteria = '- ログインできる\n- 誤ったパスワードではエラーが出る';
    expect(storedItems()[1]).toMatchObject({ number: 2, title: 'b', description: '', acceptanceCriteria: criteria });

    await user.click(screen.getByRole('button', { name: '詳細を閉じる' }));
    await user.click(screen.getByRole('button', { name: 'b' }));
    expect(within(screen.getByRole('complementary')).getByLabelText('受入条件')).toHaveValue(criteria);
  });

  test('受入条件だけを変えると保存ボタンが押せるようになる', async () => {
    const user = userEvent.setup();
    seed([pbi(1, 'a')]);
    window.history.replaceState(null, '', '/#PBI-1');
    renderApp(remote);
    const panel = screen.getByRole('complementary');
    expect(within(panel).getByRole('button', { name: '保存' })).toBeDisabled();
    await user.type(within(panel).getByLabelText('受入条件'), 'x');
    expect(within(panel).getByRole('button', { name: '保存' })).toBeEnabled();
  });

  test('受入条件を書いていない PBI ではラベル付きの空の欄が出る', () => {
    seed([pbi(1, 'a')]);
    window.history.replaceState(null, '', '/#PBI-1');
    renderApp(remote);
    expect(within(screen.getByRole('complementary')).getByLabelText('受入条件')).toHaveValue('');
  });

  test('詳細からステータスを変更できる', async () => {
    const user = userEvent.setup();
    seed([pbi(1, 'a')]);
    window.history.replaceState(null, '', '/#PBI-1');
    renderApp(remote);
    await user.selectOptions(within(screen.getByRole('complementary')).getByLabelText('ステータス'), 'done');
    expect(screen.getByRole('combobox', { name: 'PBI-1 のステータス' })).toHaveValue('done');
  });
});

describe('コピー', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test('行のコピーで PBI のリンクと内容の Markdown をクリップボードに入れ、詳細パネルは開かない', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    seed([pbi(1, 'a'), { ...pbi(3, 'ログイン画面を作る', 5), status: 'in_progress', description: '説明です' }]);
    window.history.replaceState(null, '', '/Jisaku-Jira/?reload=1');
    renderApp(remote);
    await user.click(screen.getByRole('button', { name: 'PBI-3 をコピー' }));
    expect(writeText).toHaveBeenCalledWith(
      [
        '## PBI-3 ログイン画面を作る',
        '',
        `- リンク: ${window.location.origin}/Jisaku-Jira/#1/PBI-3`,
        '- ステータス: In Progress',
        '- ストーリーポイント: 5',
        '',
        '### 説明',
        '',
        '説明です',
        '',
        '### 受入条件',
        '',
        '（なし）',
        '',
      ].join('\n'),
    );
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(window.location.hash).toBe('');
  });

  test('成功すると「コピー済み」にして読み上げ、2 秒後に「コピー」に戻す', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    seed([pbi(1, 'a'), pbi(3, 'c')]);
    renderApp(remote);
    const button = screen.getByRole('button', { name: 'PBI-3 をコピー' });
    await user.click(button);
    expect(button).toHaveTextContent('コピー済み');
    expect(screen.getByText('PBI-3 をコピーしました')).toHaveAttribute('role', 'status');
    expect(screen.getByRole('button', { name: 'PBI-1 をコピー' })).toHaveTextContent(/^コピー$/);
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(button).toHaveTextContent(/^コピー$/);
  });

  test('クリップボードに書き込めないと「コピー失敗」にし、バックログは変えない', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
    seed([pbi(1, 'a'), pbi(3, 'c')]);
    renderApp(remote);
    const before = stored();
    await user.click(screen.getByRole('button', { name: 'PBI-3 をコピー' }));
    expect(screen.getByRole('button', { name: 'PBI-3 をコピー' })).toHaveTextContent('コピー失敗');
    expect(screen.getByText('PBI-3 をコピーできませんでした')).toHaveAttribute('role', 'status');
    expect(stored()).toEqual(before);
  });
});

describe('削除', () => {
  test('確認で削除すると一覧から消え、残りの順序は変わらない', async () => {
    const user = userEvent.setup();
    seed([pbi(3, 'c'), pbi(1, 'a'), pbi(2, 'b')]);
    window.history.replaceState(null, '', '/#PBI-1');
    renderApp(remote);
    await user.click(within(screen.getByRole('complementary')).getByRole('button', { name: '削除' }));
    const dialog = screen.getByRole('alertdialog', { name: 'PBI-1 を削除しますか？' });
    await user.click(within(dialog).getByRole('button', { name: '削除する' }));

    expect(rowTexts()).toEqual(['PBI-3', 'PBI-2']);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(stored().projects[0].nextNumber).toBe(4);
  });

  test('確認で取り消すと削除しない', async () => {
    const user = userEvent.setup();
    seed([pbi(1, 'a'), pbi(2, 'b')]);
    window.history.replaceState(null, '', '/#PBI-2');
    renderApp(remote);
    await user.click(within(screen.getByRole('complementary')).getByRole('button', { name: '削除' }));
    await user.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(rowTexts()).toEqual(['PBI-1', 'PBI-2']);
  });
});

describe('インポート', () => {
  const importData = { version: 1, nextNumber: 6, items: [pbi(1, 'x'), pbi(5, 'y')] };
  const jsonFile = (text: string, name = 'backup.json') => new File([text], name, { type: 'application/json' });

  test('確認するとバックログを置き換え、採番はファイルの nextNumber から続く', async () => {
    const user = userEvent.setup();
    seed([pbi(1, 'current')]);
    renderApp(remote);
    await user.upload(screen.getByTestId('import-file'), jsonFile(JSON.stringify(importData)));
    const dialog = await screen.findByRole('alertdialog', { name: 'バックログを置き換えますか？' });
    expect(dialog).toHaveTextContent(
      '現在の共有データ（1 プロジェクト・1 件）を、「backup.json」の内容（1 プロジェクト・2 件）で置き換えます。',
    );
    expect(dialog).toHaveTextContent('他の人の画面の内容も置き換わります。');
    await user.click(within(dialog).getByRole('button', { name: '置き換える' }));

    expect(rowTexts()).toEqual(['PBI-1', 'PBI-5']);
    await user.type(screen.getByRole('textbox', { name: '新しい PBI のタイトル' }), 'z{Enter}');
    expect(rowTexts()).toEqual(['PBI-1', 'PBI-5', 'PBI-6']);
    expect(stored().projects[0].items.map((p) => p.number)).toEqual([1, 5, 6]);
  });

  test('インポートは他の端末の画面にも反映される', async () => {
    const user = userEvent.setup();
    seed([pbi(1, 'current')]);
    const other = renderApp(remote);
    const otherRows = () => within(other.container).getAllByRole('row').length - 1;
    // 自分の画面は別に描く。同じ共有データを見ている
    const mine = renderApp(remote);
    await user.upload(within(mine.container).getByTestId('import-file'), jsonFile(JSON.stringify(importData)));
    await user.click(await screen.findByRole('button', { name: '置き換える' }));
    expect(otherRows()).toBe(2);
  });

  test('確認で取り消すと何も変わらない', async () => {
    const user = userEvent.setup();
    seed([pbi(1, 'current')]);
    renderApp(remote);
    await user.upload(screen.getByTestId('import-file'), jsonFile(JSON.stringify(importData)));
    await user.click(await screen.findByRole('button', { name: 'キャンセル' }));
    expect(rowTexts()).toEqual(['PBI-1']);
    expect(storedItems().map((p) => p.title)).toEqual(['current']);
  });

  test('不正なファイルは理由を表示し、現在のバックログを変えない', async () => {
    const user = userEvent.setup();
    seed([pbi(1, 'current')]);
    renderApp(remote);
    await user.upload(screen.getByTestId('import-file'), jsonFile('not json', 'broken.json'));
    expect(await screen.findByRole('alert')).toHaveTextContent('「broken.json」を読み込めませんでした: JSON として読み込めません');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(rowTexts()).toEqual(['PBI-1']);
  });
});

describe('保存失敗', () => {
  test('共有データに保存できないと、作成した PBI は消えて警告を出す。閉じると消える', async () => {
    const user = userEvent.setup();
    renderApp(remote);
    remote.failNext();
    await user.type(screen.getByRole('textbox', { name: '新しい PBI のタイトル' }), 'a{Enter}');
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('変更を保存できませんでした。接続を確認して、もう一度操作してください。');
    expect(screen.queryAllByRole('row')).toHaveLength(0);
    expect(remote.backlog()).toBeNull();

    await user.click(within(alert).getByRole('button', { name: '閉じる' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('共有データとの接続', () => {
  test('受信するまでは読み込み中だけを表示する', () => {
    remote.hold();
    renderApp(remote);
    expect(screen.getByRole('status')).toHaveTextContent('読み込み中…');
    expect(screen.queryByRole('navigation', { name: 'パンくず' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'インポート' })).not.toBeInTheDocument();

    act(() => remote.flush());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '新しい PBI のタイトル' })).toBeInTheDocument();
  });

  test('接続できないと理由と再読み込みを表示する', () => {
    remote.failSubscribe('Missing or insufficient permissions.');
    renderApp(remote);
    expect(screen.getByRole('heading', { name: '共有データを読み込めませんでした' })).toBeInTheDocument();
    expect(screen.getByText('Missing or insufficient permissions.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '再読み込み' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'インポート' })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'パンくず' })).not.toBeInTheDocument();
  });

  test('他の端末で作成した PBI が一覧に出る', () => {
    seed([pbi(1, 'a')]);
    renderApp(remote);
    act(() => remote.push(backlogOf(['マイプロジェクト', [pbi(1, 'a'), pbi(2, 'ログイン画面')]])));
    expect(rowTexts()).toEqual(['PBI-1', 'PBI-2']);
  });

  test('開いている PBI が他の端末で削除されると詳細パネルが閉じる', () => {
    seed([pbi(1, 'a'), pbi(2, 'b')]);
    window.history.replaceState(null, '', '/#PBI-2');
    renderApp(remote);
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    act(() => remote.push(backlogOf(['マイプロジェクト', [pbi(1, 'a')]])));
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(rowTexts()).toEqual(['PBI-1']);
  });

  test('表示中のプロジェクトが他の端末で削除されると最初のプロジェクトになる', async () => {
    const user = userEvent.setup();
    seedTwoProjects();
    renderApp(remote);
    await switchTo(user, 'Tool');
    act(() => remote.push(backlogOf(['Web', [pbi(1, 'a')]])));
    expect(currentProject()).toBe('Web');
    expect(rowTexts()).toEqual(['PBI-1']);
  });

  test('PBI のリンクで開くと、受信してから詳細が開く', () => {
    seedTwoProjects([pbi(1, 'a')], [pbi(3, 'c')]);
    remote.hold();
    window.history.replaceState(null, '', '/#2/PBI-3');
    renderApp(remote);
    act(() => remote.flush());
    expect(currentProject()).toBe('Tool');
    expect(within(screen.getByRole('complementary')).getByRole('heading', { name: 'PBI-3' })).toBeInTheDocument();
  });
});

describe('読み込みエラー', () => {
  beforeEach(() => {
    remote = new FakeRemote('{ broken');
  });

  test('理由と選択肢を表示し、選ぶまで共有データを上書きしない', () => {
    renderApp(remote);
    expect(screen.getByRole('heading', { name: '共有データを読み込めませんでした' })).toBeInTheDocument();
    expect(screen.getByText('JSON として読み込めません')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '空で始める' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: '新しい PBI のタイトル' })).not.toBeInTheDocument();
    expect(remote.text).toBe('{ broken');
  });

  test('空で始めると確認後に空のバックログになり、保存を再開する', async () => {
    const user = userEvent.setup();
    renderApp(remote);
    await user.click(screen.getByRole('button', { name: '空で始める' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('他の人の画面も空のバックログになります。');
    await user.click(within(dialog).getByRole('button', { name: '空で始める' }));
    expect(screen.getByText(/PBI はまだありません/)).toBeInTheDocument();
    expect(stored()).toEqual(emptyBacklog());
  });

  test('インポートで復元できる', async () => {
    const user = userEvent.setup();
    renderApp(remote);
    const data = { version: 1, nextNumber: 3, items: [pbi(2, 'restored')] };
    await user.upload(screen.getByTestId('import-file'), new File([JSON.stringify(data)], 'b.json'));
    await user.click(await screen.findByRole('button', { name: '置き換える' }));
    expect(rowTexts()).toEqual(['PBI-2']);
    expect(stored()).toEqual(backlogOf(['マイプロジェクト', [pbi(2, 'restored')]]));
  });
});

/** 「Web」(id 1) と「Tool」(id 2) に PBI を分けたバックログを保存する */
function seedTwoProjects(web: Pbi[] = [pbi(1, 'a')], tool: Pbi[] = [pbi(2, 'b')]) {
  seedBacklog(backlogOf(['Web', web], ['Tool', tool]));
}

/** 選んでいるプロジェクトの名前（見出し） */
function currentProject(): string {
  return screen.getByRole('heading', { level: 1 }).textContent ?? '';
}

function breadcrumbCurrent() {
  return within(screen.getByRole('navigation', { name: 'パンくず' })).getByText((_, el) => el?.getAttribute('aria-current') === 'page');
}

function switcher() {
  return screen.getByRole('button', { name: 'プロジェクトを切り替え' });
}

async function switchTo(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(switcher());
  await user.click(screen.getByRole('menuitemradio', { name }));
}

/** 切り替えのメニューを開いて、並んでいるプロジェクトの名前を読む。読んだら閉じる */
async function projectNames(): Promise<string[]> {
  const user = userEvent.setup();
  await user.click(switcher());
  const names = within(screen.getByRole('menu')).getAllByRole('menuitemradio').map((item) => item.textContent ?? '');
  await user.keyboard('{Escape}');
  return names;
}

describe('選択中のプロジェクト', () => {
  test('初めて開くと「マイプロジェクト」だけがあり、選ばれている', async () => {
    renderApp(remote);
    expect(currentProject()).toBe('マイプロジェクト');
    expect(breadcrumbCurrent()).toHaveTextContent('マイプロジェクト');
    expect(await projectNames()).toEqual(['マイプロジェクト']);
  });

  test('件数と合計は選択中のプロジェクトだけで数える', () => {
    seedTwoProjects([pbi(1, 'a', 3), pbi(2, 'b', 5), pbi(3, 'c')], [pbi(4, 'd', 8)]);
    renderApp(remote);
    expect(rowTexts()).toEqual(['PBI-1', 'PBI-2', 'PBI-3']);
    expect(screen.getByTestId('backlog-summary')).toHaveTextContent('3 件の PBI8 pt');
  });

  test('作成した PBI は選択中のプロジェクトにだけ入り、番号はそのプロジェクトで 1 から振る', async () => {
    const user = userEvent.setup();
    seedTwoProjects([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => pbi(n, `app ${n}`)), []);
    localStorage.setItem(ACTIVE_PROJECT_KEY, '2');
    renderApp(remote);
    await user.type(screen.getByRole('textbox', { name: '新しい PBI のタイトル' }), 'yarikuri の PBI{Enter}');
    expect(rowTexts()).toEqual(['PBI-1']);
    expect(stored().projects[1].items.map((i) => i.number)).toEqual([1]);
    expect(stored().projects[0].items).toHaveLength(9);
  });

  test('別のプロジェクトの PBI のリンクで開くと、そのプロジェクトが選ばれて詳細が開く', async () => {
    const user = userEvent.setup();
    seedTwoProjects([pbi(1, 'a')], [pbi(3, 'c')]);
    localStorage.setItem(ACTIVE_PROJECT_KEY, '1');
    window.history.replaceState(null, '', '/#2/PBI-3');
    renderApp(remote);
    expect(currentProject()).toBe('Tool');
    expect(rowTexts()).toEqual(['PBI-3']);
    expect(within(screen.getByRole('complementary')).getByRole('heading', { name: 'PBI-3' })).toBeInTheDocument();

    // 詳細を閉じても同じプロジェクトに留まり、それを記憶する
    await user.click(screen.getByRole('button', { name: '詳細を閉じる' }));
    expect(currentProject()).toBe('Tool');
    expect(localStorage.getItem(ACTIVE_PROJECT_KEY)).toBe('2');
  });

  test('無い PBI のリンクでは、記憶したプロジェクトの一覧だけを表示する', () => {
    seedTwoProjects();
    localStorage.setItem(ACTIVE_PROJECT_KEY, '2');
    window.history.replaceState(null, '', '/#PBI-9');
    renderApp(remote);
    expect(currentProject()).toBe('Tool');
    expect(rowTexts()).toEqual(['PBI-2']);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  test('記憶したプロジェクトが無くなっていたら最初のプロジェクトを表示する', () => {
    seedTwoProjects();
    localStorage.setItem(ACTIVE_PROJECT_KEY, '9');
    renderApp(remote);
    expect(currentProject()).toBe('Web');
  });

  test('旧形式（version 1）の共有データで開くと「マイプロジェクト」に PBI が並び、採番が続く', async () => {
    const user = userEvent.setup();
    remote = new FakeRemote(JSON.stringify({ version: 1, nextNumber: 4, items: [pbi(1, 'a'), pbi(2, 'b')] }));
    renderApp(remote);
    expect(await projectNames()).toEqual(['マイプロジェクト']);
    expect(rowTexts()).toEqual(['PBI-1', 'PBI-2']);
    await user.type(screen.getByRole('textbox', { name: '新しい PBI のタイトル' }), 'c{Enter}');
    expect(rowTexts()).toEqual(['PBI-1', 'PBI-2', 'PBI-4']);
    expect(stored().version).toBe(3);
  });
});

describe('プロジェクトごとの番号とリンク', () => {
  const panelTitle = () => within(screen.getByRole('complementary')).getByLabelText('タイトル');

  test('同じ番号の PBI が別のプロジェクトにあっても、リンクのプロジェクトの PBI を開く', () => {
    seedTwoProjects([pbi(3, 'web の 3')], [pbi(3, 'tool の 3')]);
    localStorage.setItem(ACTIVE_PROJECT_KEY, '1');
    window.history.replaceState(null, '', '/#2/PBI-3');
    renderApp(remote);
    expect(currentProject()).toBe('Tool');
    expect(panelTitle()).toHaveValue('tool の 3');
  });

  test('リンクはプロジェクトの名前ではなく id で指すので、名前を変えても開ける', () => {
    seedBacklog(backlogOf(['Web', [pbi(1, 'a')]], ['Tools', [pbi(3, 'c')]]));
    window.history.replaceState(null, '', '/#2/PBI-3');
    renderApp(remote);
    expect(currentProject()).toBe('Tools');
    expect(panelTitle()).toHaveValue('c');
  });

  test('2つ目のプロジェクトで PBI を選ぶと、ハッシュがそのプロジェクトの id を含む', async () => {
    const user = userEvent.setup();
    seedTwoProjects([pbi(3, 'web の 3')], [pbi(3, 'tool の 3')]);
    localStorage.setItem(ACTIVE_PROJECT_KEY, '2');
    renderApp(remote);
    await user.click(screen.getByRole('button', { name: 'tool の 3' }));
    expect(window.location.hash).toBe('#2/PBI-3');
  });

  test.each([
    ['プロジェクトに無い番号', '/#2/PBI-9'],
    ['無いプロジェクト', '/#7/PBI-1'],
  ])('%s のリンクでは、記憶したプロジェクトの一覧だけを表示する', (_, url) => {
    seedTwoProjects([pbi(1, 'a')], [pbi(1, 'b')]);
    localStorage.setItem(ACTIVE_PROJECT_KEY, '2');
    window.history.replaceState(null, '', url);
    renderApp(remote);
    expect(currentProject()).toBe('Tool');
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  test('以前の形式のリンク #PBI-<番号> は最初のタブのプロジェクトの PBI を開き、ハッシュは書き換えない', () => {
    seedTwoProjects([pbi(8, 'app の 8')], [pbi(8, 'yarikuri の 8')]);
    localStorage.setItem(ACTIVE_PROJECT_KEY, '2');
    window.history.replaceState(null, '', '/#PBI-8');
    renderApp(remote);
    expect(currentProject()).toBe('Web');
    expect(panelTitle()).toHaveValue('app の 8');
    expect(window.location.hash).toBe('#PBI-8');
  });

  test('以前の形式のリンクで、最初のプロジェクトに無い番号なら一覧だけを表示する', () => {
    seedTwoProjects([pbi(1, 'a')], [pbi(12, 'b')]);
    localStorage.setItem(ACTIVE_PROJECT_KEY, '2');
    window.history.replaceState(null, '', '/#PBI-12');
    renderApp(remote);
    expect(currentProject()).toBe('Tool');
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  test('別々のプロジェクトの同じ番号の PBI に切り替えると、詳細パネルの内容も切り替わる', () => {
    seedTwoProjects([pbi(1, 'web の 1')], [pbi(1, 'tool の 1')]);
    window.history.replaceState(null, '', '/#1/PBI-1');
    renderApp(remote);
    expect(panelTitle()).toHaveValue('web の 1');
    act(() => {
      window.history.replaceState(null, '', '/#2/PBI-1');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(currentProject()).toBe('Tool');
    expect(panelTitle()).toHaveValue('tool の 1');
  });

  test('通し番号（version 2）の共有データで開くと、2つ目以降のプロジェクトを振り直して表示する', async () => {
    const user = userEvent.setup();
    const at = (n: number) => `2026-10-01T00:${String(n).padStart(2, '0')}:00.000Z`;
    remote = new FakeRemote(
      JSON.stringify({
        version: 2,
        nextNumber: 11,
        nextProjectId: 3,
        projects: [
          {
            id: 1,
            name: 'Jisaku-Jira-App',
            items: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ ...pbi(n, `app ${n}`), createdAt: at(n) })),
          },
          { id: 2, name: 'Yarikuri', items: [{ ...pbi(10, 'yarikuri'), createdAt: at(10) }] },
        ],
      }),
    );
    renderApp(remote);
    expect(rowTexts()).toEqual(['PBI-1', 'PBI-2', 'PBI-3', 'PBI-4', 'PBI-5', 'PBI-6', 'PBI-7', 'PBI-8', 'PBI-9']);
    await switchTo(user, 'Yarikuri');
    expect(rowTexts()).toEqual(['PBI-1']);

    await user.type(screen.getByRole('textbox', { name: '新しい PBI のタイトル' }), '次の PBI{Enter}');
    expect(rowTexts()).toEqual(['PBI-1', 'PBI-2']);
    expect(stored().version).toBe(3);
    expect(stored().projects.map((p) => p.items.map((i) => i.number))).toEqual([
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
      [1, 2],
    ]);
  });
});

describe('プロジェクトの切り替え', () => {
  test('メニューでプロジェクトを選ぶとその一覧に切り替わり、メニューが閉じる', async () => {
    const user = userEvent.setup();
    seedTwoProjects();
    renderApp(remote);
    expect(rowTexts()).toEqual(['PBI-1']);
    await switchTo(user, 'Tool');
    expect(rowTexts()).toEqual(['PBI-2']);
    expect(currentProject()).toBe('Tool');
    expect(breadcrumbCurrent()).toHaveTextContent('Tool');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  test('メニューには作成した順に並び、選択中のプロジェクトだけに印がある', async () => {
    const user = userEvent.setup();
    seedTwoProjects();
    localStorage.setItem(ACTIVE_PROJECT_KEY, '2');
    renderApp(remote);
    await user.click(switcher());
    const items = within(screen.getByRole('menu')).getAllByRole('menuitemradio');
    expect(items.map((i) => i.textContent)).toEqual(['Web', 'Tool']);
    expect(items.map((i) => i.getAttribute('aria-checked'))).toEqual(['false', 'true']);
    expect(switcher()).toHaveAttribute('aria-expanded', 'true');
  });

  test('切り替えると詳細パネルが閉じ、ハッシュが消える', async () => {
    const user = userEvent.setup();
    seedTwoProjects();
    window.history.replaceState(null, '', '/#PBI-1');
    renderApp(remote);
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    await switchTo(user, 'Tool');
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(window.location.hash).toBe('');
  });

  test('キーボードで開き、下矢印で移動して Enter で切り替える', async () => {
    const user = userEvent.setup();
    seedTwoProjects();
    renderApp(remote);
    switcher().focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('menuitemradio', { name: 'Web' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitemradio', { name: 'Tool' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(currentProject()).toBe('Tool');
    expect(rowTexts()).toEqual(['PBI-2']);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(switcher()).toHaveFocus();
  });

  test('上矢印は端で反対側に回り、End で最後の項目に移る', async () => {
    const user = userEvent.setup();
    seedTwoProjects();
    renderApp(remote);
    await user.click(switcher());
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'プロジェクトを追加' })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('menuitemradio', { name: 'Web' })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('menuitem', { name: 'プロジェクトを追加' })).toHaveFocus();
  });

  test('Escape で閉じると切り替えず、切り替えのボタンにフォーカスが戻る', async () => {
    const user = userEvent.setup();
    seedTwoProjects();
    renderApp(remote);
    await user.click(switcher());
    await user.keyboard('{ArrowDown}{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(switcher()).toHaveFocus();
    expect(currentProject()).toBe('Web');
  });

  test('メニューの外を押すと閉じる', async () => {
    const user = userEvent.setup();
    seedTwoProjects();
    renderApp(remote);
    await user.click(switcher());
    await user.click(screen.getByRole('heading', { level: 1 }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(currentProject()).toBe('Web');
  });

  test('再読み込み後も最後に選んだプロジェクトが選ばれる', async () => {
    const user = userEvent.setup();
    seedTwoProjects();
    const first = renderApp(remote);
    await switchTo(user, 'Tool');
    first.unmount();

    renderApp(remote);
    expect(currentProject()).toBe('Tool');
    expect(rowTexts()).toEqual(['PBI-2']);
  });
});

describe('プロジェクトの作成', () => {
  test('メニューの「プロジェクトを追加」で見出しの位置に名前を入れ、Enter で末尾に追加して切り替わる', async () => {
    const user = userEvent.setup();
    seedTwoProjects();
    renderApp(remote);
    await user.click(switcher());
    await user.click(screen.getByRole('menuitem', { name: 'プロジェクトを追加' }));
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: '新しいプロジェクトの名前' }), '  Docs  {Enter}');
    expect(currentProject()).toBe('Docs');
    expect(await projectNames()).toEqual(['Web', 'Tool', 'Docs']);
    expect(screen.getByText(/PBI はまだありません/)).toBeInTheDocument();
    expect(stored().projects.map((p) => p.name)).toEqual(['Web', 'Tool', 'Docs']);
  });

  test('名前が空のまま Enter ではエラーを表示して作成しない', async () => {
    const user = userEvent.setup();
    renderApp(remote);
    await user.click(switcher());
    await user.click(screen.getByRole('menuitem', { name: 'プロジェクトを追加' }));
    await user.type(screen.getByRole('textbox', { name: '新しいプロジェクトの名前' }), '   {Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('プロジェクト名を入力してください');
    expect(remote.backlog()).toBeNull();
  });

  test('Escape で取り消すと作成せず、元の見出しに戻る', async () => {
    const user = userEvent.setup();
    renderApp(remote);
    await user.click(switcher());
    await user.click(screen.getByRole('menuitem', { name: 'プロジェクトを追加' }));
    await user.type(screen.getByRole('textbox', { name: '新しいプロジェクトの名前' }), 'Tool{Escape}');
    expect(screen.queryByRole('textbox', { name: '新しいプロジェクトの名前' })).not.toBeInTheDocument();
    expect(currentProject()).toBe('マイプロジェクト');
    expect(await projectNames()).toEqual(['マイプロジェクト']);
  });
});

describe('プロジェクトの名前変更', () => {
  async function startRename(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'プロジェクトの操作' }));
    await user.click(screen.getByRole('menuitem', { name: '名前を変更' }));
  }

  test('「…」の名前を変更で変えると、見出し・パンくず・メニューの名前が変わり、PBI はそのまま', async () => {
    const user = userEvent.setup();
    seedTwoProjects();
    renderApp(remote);
    await startRename(user);
    const input = screen.getByRole('textbox', { name: 'プロジェクト名' });
    expect(input).toHaveValue('Web');
    await user.clear(input);
    await user.type(input, 'Web アプリ{Enter}');
    expect(currentProject()).toBe('Web アプリ');
    expect(breadcrumbCurrent()).toHaveTextContent('Web アプリ');
    expect(await projectNames()).toEqual(['Web アプリ', 'Tool']);
    expect(rowTexts()).toEqual(['PBI-1']);
    expect(stored().projects[0]).toMatchObject({ name: 'Web アプリ', items: [pbi(1, 'a')] });
  });

  test('空の名前ではエラーを表示して変えない', async () => {
    const user = userEvent.setup();
    seedTwoProjects();
    renderApp(remote);
    await startRename(user);
    await user.clear(screen.getByRole('textbox', { name: 'プロジェクト名' }));
    await user.keyboard('{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('プロジェクト名を入力してください');
    expect(stored().projects[0].name).toBe('Web');
  });

  test('Escape で取り消すと変えない', async () => {
    const user = userEvent.setup();
    seedTwoProjects();
    renderApp(remote);
    await startRename(user);
    await user.type(screen.getByRole('textbox', { name: 'プロジェクト名' }), 'x{Escape}');
    expect(currentProject()).toBe('Web');
    expect(await projectNames()).toEqual(['Web', 'Tool']);
  });
});

describe('プロジェクトの削除', () => {
  function seedThree() {
    seedBacklog(
      backlogOf(['Web', [pbi(1, 'a')]], ['Tool', [pbi(2, 'b'), pbi(3, 'c'), pbi(4, 'd')]], ['Docs', [pbi(5, 'e')]]),
    );
    localStorage.setItem(ACTIVE_PROJECT_KEY, '2');
  }

  async function startDelete(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'プロジェクトの操作' }));
    await user.click(screen.getByRole('menuitem', { name: '削除' }));
  }

  test('確認して削除すると PBI ごと消え、1つ前のプロジェクトに切り替わる', async () => {
    const user = userEvent.setup();
    seedThree();
    renderApp(remote);
    await startDelete(user);
    const dialog = screen.getByRole('alertdialog', { name: 'プロジェクトを削除しますか？' });
    expect(dialog).toHaveTextContent('「Tool」と PBI 3 件を削除します。元に戻せません。');
    await user.click(within(dialog).getByRole('button', { name: '削除する' }));

    expect(currentProject()).toBe('Web');
    expect(await projectNames()).toEqual(['Web', 'Docs']);
    expect(rowTexts()).toEqual(['PBI-1']);
    expect(stored().projects.map((p) => p.items.map((i) => i.number))).toEqual([[1], [5]]);
    expect(stored().projects.map((p) => p.nextNumber)).toEqual([2, 6]);
  });

  test('1つ前が無いときは1つ後に切り替わる', async () => {
    const user = userEvent.setup();
    seedThree();
    localStorage.setItem(ACTIVE_PROJECT_KEY, '1');
    renderApp(remote);
    await startDelete(user);
    await user.click(screen.getByRole('button', { name: '削除する' }));
    expect(currentProject()).toBe('Tool');
    expect(await projectNames()).toEqual(['Tool', 'Docs']);
  });

  test('確認で取り消すと削除しない', async () => {
    const user = userEvent.setup();
    seedThree();
    renderApp(remote);
    await startDelete(user);
    await user.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(await projectNames()).toEqual(['Web', 'Tool', 'Docs']);
    expect(rowTexts()).toEqual(['PBI-2', 'PBI-3', 'PBI-4']);
  });

  test('プロジェクトが1つだけのときは「削除」を選べず、理由を示す', async () => {
    const user = userEvent.setup();
    renderApp(remote);
    await user.click(screen.getByRole('button', { name: 'プロジェクトの操作' }));
    const item = screen.getByRole('menuitem', { name: '削除' });
    expect(item).toHaveAttribute('aria-disabled', 'true');
    expect(item).toHaveAccessibleDescription('プロジェクトが1つだけのときは削除できません');
    await user.click(item);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

describe('インポート（複数のプロジェクト）', () => {
  test('確認文にプロジェクト数と件数を出し、置き換え後は最初のプロジェクトを選ぶ', async () => {
    const user = userEvent.setup();
    seedTwoProjects();
    localStorage.setItem(ACTIVE_PROJECT_KEY, '2');
    renderApp(remote);
    const files = backlogOf(['Web', [pbi(1, 'x')]], ['Tool', [pbi(5, 'y')]]);
    const data = { ...files, projects: files.projects.map((p) => ({ ...p, nextNumber: 6 })) };
    await user.upload(screen.getByTestId('import-file'), new File([JSON.stringify(data)], 'all.json'));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent(
      '現在の共有データ（2 プロジェクト・2 件）を、「all.json」の内容（2 プロジェクト・2 件）で置き換えます。',
    );
    await user.click(within(dialog).getByRole('button', { name: '置き換える' }));
    expect(currentProject()).toBe('Web');
    expect(rowTexts()).toEqual(['PBI-1']);
    await user.type(screen.getByRole('textbox', { name: '新しい PBI のタイトル' }), 'z{Enter}');
    expect(rowTexts()).toEqual(['PBI-1', 'PBI-6']);
  });

  test('別々のプロジェクトに同じ番号があるファイルも読み込む', async () => {
    const user = userEvent.setup();
    seedTwoProjects();
    renderApp(remote);
    const data = backlogOf(['Web', [pbi(1, 'x')]], ['Tool', [pbi(1, 'y')]]);
    await user.upload(screen.getByTestId('import-file'), new File([JSON.stringify(data)], 'same.json'));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: '置き換える' }));
    expect(rowTexts()).toEqual(['PBI-1']);
    await switchTo(user, 'Tool');
    expect(rowTexts()).toEqual(['PBI-1']);
  });

  test('1つのプロジェクトの中で番号が重複したファイルは読み込まない', async () => {
    const user = userEvent.setup();
    seedTwoProjects();
    renderApp(remote);
    const data = backlogOf(['Web', [pbi(1, 'x')]], ['Tool', [pbi(1, 'y'), pbi(1, 'z')]]);
    await user.upload(screen.getByTestId('import-file'), new File([JSON.stringify(data)], 'dup.json'));
    expect(await screen.findByRole('alert')).toHaveTextContent('番号 1 が重複しています');
    expect(await projectNames()).toEqual(['Web', 'Tool']);
  });
});

describe('このブラウザに残った以前のデータ', () => {
  const legacyBacklog = () => backlogOf(['Web', [pbi(1, 'old-a'), pbi(2, 'old-b')]], ['Tool', [pbi(3, 'old-c')]]);

  function seedLegacy(data: unknown = legacyBacklog()) {
    localStorage.setItem(LEGACY_STORAGE_KEY, typeof data === 'string' ? data : JSON.stringify(data));
  }

  const banner = () => screen.queryByTestId('legacy-backlog');

  test('残っていると件数とともに知らせ、共有データは変えない', () => {
    seed([pbi(1, 'shared')]);
    seedLegacy();
    renderApp(remote);
    expect(banner()).toHaveTextContent('このブラウザに以前のデータ（2 プロジェクト・3 件）が残っています。');
    expect(rowTexts()).toEqual(['PBI-1']);
    expect(stored().projects[0].items.map((p) => p.title)).toEqual(['shared']);
  });

  test('取り込むと確認後に共有データを置き換え、以前のデータと帯が消える', async () => {
    const user = userEvent.setup();
    seed([pbi(1, 'shared')]);
    seedLegacy();
    renderApp(remote);
    await user.click(within(banner()!).getByRole('button', { name: '共有データに取り込む' }));
    const dialog = screen.getByRole('alertdialog', { name: 'バックログを置き換えますか？' });
    expect(dialog).toHaveTextContent(
      '現在の共有データ（1 プロジェクト・1 件）を、このブラウザの以前のデータ（2 プロジェクト・3 件）で置き換えます。',
    );
    await user.click(within(dialog).getByRole('button', { name: '置き換える' }));

    expect(stored()).toEqual(legacyBacklog());
    expect(currentProject()).toBe('Web');
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
    expect(banner()).not.toBeInTheDocument();
  });

  test('取り込みを保存できなければ、以前のデータと帯は残る', async () => {
    const user = userEvent.setup();
    seedLegacy();
    renderApp(remote);
    remote.failNext();
    await user.click(within(banner()!).getByRole('button', { name: '共有データに取り込む' }));
    await user.click(screen.getByRole('button', { name: '置き換える' }));

    expect(screen.getByRole('alert')).toHaveTextContent('変更を保存できませんでした');
    expect(remote.backlog()).toBeNull();
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).not.toBeNull();
    expect(banner()).toBeInTheDocument();
  });

  test('消すと確認後に以前のデータだけが消え、共有データは変わらない', async () => {
    const user = userEvent.setup();
    seed([pbi(1, 'shared')]);
    seedLegacy();
    renderApp(remote);
    await user.click(within(banner()!).getByRole('button', { name: 'このブラウザから消す' }));
    const dialog = screen.getByRole('alertdialog', { name: '以前のデータを消しますか？' });
    await user.click(within(dialog).getByRole('button', { name: '消す' }));

    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
    expect(banner()).not.toBeInTheDocument();
    expect(stored().projects[0].items.map((p) => p.title)).toEqual(['shared']);
    expect(remote.applyCount).toBe(0);
  });

  test('消す確認で取り消すと何も変わらない', async () => {
    const user = userEvent.setup();
    seedLegacy();
    renderApp(remote);
    await user.click(within(banner()!).getByRole('button', { name: 'このブラウザから消す' }));
    await user.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).not.toBeNull();
    expect(banner()).toBeInTheDocument();
  });

  test('version 1 の以前のデータを取り込むと「マイプロジェクト」に入り、採番が続く', async () => {
    const user = userEvent.setup();
    seedLegacy({ version: 1, nextNumber: 4, items: [pbi(1, 'a'), pbi(2, 'b')] });
    renderApp(remote);
    expect(banner()).toHaveTextContent('1 プロジェクト・2 件');
    await user.click(within(banner()!).getByRole('button', { name: '共有データに取り込む' }));
    await user.click(screen.getByRole('button', { name: '置き換える' }));

    expect(await projectNames()).toEqual(['マイプロジェクト']);
    expect(rowTexts()).toEqual(['PBI-1', 'PBI-2']);
    await user.type(screen.getByRole('textbox', { name: '新しい PBI のタイトル' }), 'c{Enter}');
    expect(rowTexts()).toEqual(['PBI-1', 'PBI-2', 'PBI-4']);
  });

  test('読めない以前のデータでは帯を出さず、キーも残す', () => {
    seedLegacy('{ broken');
    renderApp(remote);
    expect(banner()).not.toBeInTheDocument();
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBe('{ broken');
  });

  test('読み込み中は帯を出さない', () => {
    seedLegacy();
    remote.hold();
    renderApp(remote);
    expect(banner()).not.toBeInTheDocument();
  });
});

/** a が b より前にある */
function isBefore(a: Element, b: Element): boolean {
  return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

describe('画面の構成', () => {
  test('上部ナビ、パンくず、見出し、バックログのビューのタブ、一覧の区画の順に並ぶ', () => {
    seedTwoProjects();
    renderApp(remote);
    const banner = screen.getByRole('banner');
    expect(banner).toHaveTextContent('Jisaku Jira');
    expect(within(banner).getByRole('button', { name: 'エクスポート' })).toBeInTheDocument();
    expect(within(banner).getByRole('button', { name: 'インポート' })).toBeInTheDocument();

    const breadcrumbs = screen.getByRole('navigation', { name: 'パンくず' });
    expect(within(breadcrumbs).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['プロジェクト', 'Web']);
    expect(breadcrumbCurrent()).toHaveTextContent('Web');

    const views = screen.getByRole('navigation', { name: 'ビュー' });
    const backlogView = within(views).getByText('バックログ');
    expect(backlogView).toHaveAttribute('aria-current', 'page');
    expect(within(views).queryByRole('link')).not.toBeInTheDocument();

    const heading = screen.getByRole('heading', { level: 1, name: 'Web' });
    const section = screen.getByRole('region', { name: 'バックログ' });
    expect(isBefore(banner, breadcrumbs)).toBe(true);
    expect(isBefore(breadcrumbs, heading)).toBe(true);
    expect(isBefore(heading, views)).toBe(true);
    expect(isBefore(views, section)).toBe(true);
  });

  test('接続エラーの画面では上部ナビだけを出し、パンくずとビューのタブは出さない', () => {
    remote.failSubscribe('Missing or insufficient permissions.');
    renderApp(remote);
    expect(screen.getByRole('banner')).toHaveTextContent('Jisaku Jira');
    expect(screen.queryByRole('navigation', { name: 'パンくず' })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'ビュー' })).not.toBeInTheDocument();
  });
});

describe('一覧の区画と行', () => {
  test('区画の見出しの行に、その区画の件数・合計とステータス別の SP を出す', () => {
    seed([pbi(1, 'a', 3), pbi(2, 'b', 5), { ...pbi(3, 'c', 2), status: 'done' }]);
    renderApp(remote);
    const active = screen.getByRole('region', { name: 'バックログ' });
    expect(within(active).getByTestId('backlog-summary')).toHaveTextContent('2 件の PBI8 pt');
    const badges = within(within(active).getByRole('list', { name: 'ステータス別の SP' })).getAllByRole('listitem');
    expect(badges.map((li) => li.textContent)).toEqual(['To Do 8', 'In Progress 0']);
    const done = screen.getByRole('region', { name: 'Done' });
    expect(within(done).getByTestId('done-summary')).toHaveTextContent('1 件の PBI2 pt');
    const doneBadges = within(within(done).getByRole('list', { name: 'ステータス別の SP' })).getAllByRole('listitem');
    expect(doneBadges.map((li) => li.textContent)).toEqual(['Done 2']);
    expect(within(done).queryByRole('textbox', { name: '新しい PBI のタイトル' })).not.toBeInTheDocument();
  });

  test('SP が未設定の行は「-」のバッジを出し、読み上げでは「未設定」と伝える', () => {
    seed([pbi(1, 'a')]);
    renderApp(remote);
    const cell = within(screen.getAllByRole('row')[1]).getAllByRole('cell')[5];
    expect(within(cell).getByText('-')).toHaveAttribute('aria-hidden', 'true');
    expect(cell).toHaveTextContent('-未設定');
  });

  test('Done の行の ID にだけ取り消し線のクラスが付く', () => {
    seed([pbi(1, 'a'), { ...pbi(2, 'b'), status: 'done' }]);
    renderApp(remote);
    const idCell = (table: string) =>
      within(within(screen.getByRole('table', { name: table })).getAllByRole('row')[1]).getAllByRole('cell')[2];
    expect(idCell('Done')).toHaveClass('doneId');
    expect(idCell('未完了の PBI')).not.toHaveClass('doneId');
  });

  test('作成欄は未完了の区画の表の下にあり、作った PBI は作成欄のすぐ上の行に並ぶ', async () => {
    const user = userEvent.setup();
    seed([pbi(1, 'a')]);
    renderApp(remote);
    const input = screen.getByRole('textbox', { name: '新しい PBI のタイトル' });
    const table = screen.getByRole('table', { name: '未完了の PBI' });
    expect(within(screen.getByRole('region', { name: 'バックログ' })).getByRole('textbox')).toBe(input);
    expect(isBefore(table, input)).toBe(true);
    await user.type(input, '次の PBI{Enter}');
    expect(rowTexts()).toEqual(['PBI-1', 'PBI-2']);
    const rows = within(table).getAllByRole('row');
    expect(isBefore(rows[rows.length - 1], input)).toBe(true);
  });
});

describe('詳細パネルの並び', () => {
  test('ID と閉じるボタン、タイトル、ステータス、説明、受入条件、詳細の順に並ぶ', () => {
    seed([pbi(1, 'a', 3)]);
    window.history.replaceState(null, '', '/#PBI-1');
    renderApp(remote);
    const panel = screen.getByRole('complementary');
    const order = [
      within(panel).getByRole('heading', { name: 'PBI-1' }),
      within(panel).getByRole('button', { name: '詳細を閉じる' }),
      within(panel).getByLabelText('タイトル'),
      within(panel).getByLabelText('ステータス'),
      within(panel).getByLabelText('説明'),
      within(panel).getByLabelText('受入条件'),
      within(panel).getByRole('heading', { name: '詳細' }),
      within(panel).getByLabelText('ストーリーポイント'),
    ];
    for (let i = 1; i < order.length; i++) expect(isBefore(order[i - 1], order[i])).toBe(true);
    expect(within(panel).getByLabelText('ストーリーポイント')).toHaveValue('3');
  });

  test('タイトルは折り返して見せるが、Enter では改行せずに保存する', async () => {
    const user = userEvent.setup();
    seed([pbi(1, 'a')]);
    window.history.replaceState(null, '', '/#PBI-1');
    renderApp(remote);
    const title = within(screen.getByRole('complementary')).getByLabelText('タイトル');
    await user.type(title, 'bc{Enter}');
    expect(title).toHaveValue('abc');
    expect(storedItems()[0].title).toBe('abc');
  });
});
