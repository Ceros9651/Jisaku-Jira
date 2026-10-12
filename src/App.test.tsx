import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { type Backlog, type Pbi, emptyBacklog } from './backlog/model';
import { ACTIVE_PROJECT_KEY, STORAGE_KEY, loadBacklog } from './backlog/storage';
import { backlogOf } from './test/backlog';

const now = '2026-10-12T00:00:00.000Z';

function pbi(number: number, title: string, storyPoints: number | null = null): Pbi {
  return { number, title, description: '', status: 'todo', storyPoints, createdAt: now, updatedAt: now };
}

/** 「マイプロジェクト」1つに PBI を入れて保存する */
function seed(items: Pbi[], nextNumber = Math.max(0, ...items.map((p) => p.number)) + 1) {
  seedBacklog({ ...backlogOf(['マイプロジェクト', items]), nextNumber });
}

function seedBacklog(backlog: Backlog) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(backlog));
}

/** 最初のプロジェクトの PBI */
function storedItems(): Pbi[] {
  return stored().projects[0].items;
}

function rowTexts(): string[] {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[1].textContent ?? '');
}

function stored(): Backlog {
  const result = loadBacklog(localStorage);
  if (result.kind !== 'loaded') throw new Error('not loaded');
  return result.backlog;
}

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('一覧', () => {
  test('ID・タイトル・ステータス・SP を並び順で表示し、件数と合計を見出しに出す', () => {
    seed([pbi(2, 'b', 3), pbi(1, 'a', 5), pbi(4, 'c')]);
    render(<App />);
    expect(rowTexts()).toEqual(['PBI-2', 'PBI-1', 'PBI-4']);
    const first = screen.getAllByRole('row')[1];
    expect(within(first).getByRole('button', { name: 'b' })).toBeInTheDocument();
    expect(within(first).getByRole('combobox', { name: 'PBI-2 のステータス' })).toHaveValue('todo');
    expect(within(first).getAllByRole('cell')[4]).toHaveTextContent('3');
    expect(screen.getByTestId('backlog-summary')).toHaveTextContent('3 件8 pt');
  });

  test('見出しにステータス別の SP を出す', () => {
    seed([
      { ...pbi(1, 'a', 3), status: 'done' },
      { ...pbi(2, 'b', 5), status: 'in_progress' },
      pbi(3, 'c', 2),
      pbi(4, 'd'),
    ]);
    render(<App />);
    expect(screen.getByTestId('backlog-summary')).toHaveTextContent('4 件10 pt');
    const items = within(screen.getByRole('list', { name: 'ステータス別の SP' })).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual(['To Do 2', 'In Progress 5', 'Done 3']);
  });

  test('PBI がないときは空状態と作成の操作を表示する', () => {
    render(<App />);
    expect(screen.getByText(/PBI はまだありません/)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '新しい PBI のタイトル' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '作成' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('作成', () => {
  test('Enter で末尾に PBI-<番号> として追加する', async () => {
    const user = userEvent.setup();
    seed([pbi(1, 'a'), pbi(3, 'c')], 4);
    render(<App />);
    await user.type(screen.getByRole('textbox', { name: '新しい PBI のタイトル' }), 'ログイン画面を作る{Enter}');
    expect(rowTexts()).toEqual(['PBI-1', 'PBI-3', 'PBI-4']);
    expect(screen.getByRole('button', { name: 'ログイン画面を作る' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '新しい PBI のタイトル' })).toHaveValue('');
  });

  test('空タイトルではエラーを表示して作成しない', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByRole('textbox', { name: '新しい PBI のタイトル' }), '   {Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('タイトルを入力してください');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('ステータス', () => {
  test('一覧で変更すると反映され、保存される', async () => {
    const user = userEvent.setup();
    seed([pbi(1, 'a')]);
    render(<App />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'PBI-1 のステータス' }), 'in_progress');
    expect(screen.getByRole('combobox', { name: 'PBI-1 のステータス' })).toHaveValue('in_progress');
    expect(storedItems()[0].status).toBe('in_progress');
  });
});

describe('詳細パネル', () => {
  test('行を選ぶと詳細を開き、URL ハッシュに反映する', async () => {
    const user = userEvent.setup();
    seed([pbi(1, 'a'), pbi(2, 'b')]);
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'b' }));
    const panel = screen.getByRole('complementary');
    expect(within(panel).getByRole('heading', { name: 'PBI-2' })).toBeInTheDocument();
    expect(within(panel).getByLabelText('タイトル')).toHaveValue('b');
    expect(window.location.hash).toBe('#PBI-2');
  });

  test('ハッシュ付きで開くとその PBI が選ばれる', () => {
    seed([pbi(1, 'a'), pbi(3, 'c')]);
    window.history.replaceState(null, '', '/#PBI-3');
    render(<App />);
    expect(within(screen.getByRole('complementary')).getByRole('heading', { name: 'PBI-3' })).toBeInTheDocument();
  });

  test('無い PBI のハッシュで開くと一覧だけを表示する', () => {
    seed([pbi(1, 'a'), pbi(3, 'c')]);
    window.history.replaceState(null, '', '/#PBI-9');
    render(<App />);
    expect(rowTexts()).toEqual(['PBI-1', 'PBI-3']);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  test('タイトル・説明・SP を編集して保存すると、ID と位置は変わらない', async () => {
    const user = userEvent.setup();
    seed([pbi(1, 'a'), pbi(2, 'b'), pbi(3, 'c')]);
    render(<App />);
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
    render(<App />);
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
    render(<App />);
    const panel = screen.getByRole('complementary');
    await user.clear(within(panel).getByLabelText(field));
    if (value) await user.type(within(panel).getByLabelText(field), value);
    await user.click(within(panel).getByRole('button', { name: '保存' }));
    expect(within(panel).getByRole('alert')).toHaveTextContent(message);
    expect(storedItems()[0]).toMatchObject({ title: 'a', storyPoints: null });
  });

  test('詳細からステータスを変更できる', async () => {
    const user = userEvent.setup();
    seed([pbi(1, 'a')]);
    window.history.replaceState(null, '', '/#PBI-1');
    render(<App />);
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
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'PBI-3 をコピー' }));
    expect(writeText).toHaveBeenCalledWith(
      [
        '## PBI-3 ログイン画面を作る',
        '',
        `- リンク: ${window.location.origin}/Jisaku-Jira/#PBI-3`,
        '- ステータス: In Progress',
        '- ストーリーポイント: 5',
        '',
        '### 説明',
        '',
        '説明です',
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
    render(<App />);
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
    render(<App />);
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
    render(<App />);
    await user.click(within(screen.getByRole('complementary')).getByRole('button', { name: '削除' }));
    const dialog = screen.getByRole('alertdialog', { name: 'PBI-1 を削除しますか？' });
    await user.click(within(dialog).getByRole('button', { name: '削除する' }));

    expect(rowTexts()).toEqual(['PBI-3', 'PBI-2']);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(stored().nextNumber).toBe(4);
  });

  test('確認で取り消すと削除しない', async () => {
    const user = userEvent.setup();
    seed([pbi(1, 'a'), pbi(2, 'b')]);
    window.history.replaceState(null, '', '/#PBI-2');
    render(<App />);
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
    render(<App />);
    await user.upload(screen.getByTestId('import-file'), jsonFile(JSON.stringify(importData)));
    const dialog = await screen.findByRole('alertdialog', { name: 'バックログを置き換えますか？' });
    expect(dialog).toHaveTextContent(
      '現在のデータ（1 プロジェクト・1 件）を、「backup.json」の内容（1 プロジェクト・2 件）で置き換えます。',
    );
    await user.click(within(dialog).getByRole('button', { name: '置き換える' }));

    expect(rowTexts()).toEqual(['PBI-1', 'PBI-5']);
    await user.type(screen.getByRole('textbox', { name: '新しい PBI のタイトル' }), 'z{Enter}');
    expect(rowTexts()).toEqual(['PBI-1', 'PBI-5', 'PBI-6']);
  });

  test('確認で取り消すと何も変わらない', async () => {
    const user = userEvent.setup();
    seed([pbi(1, 'current')]);
    render(<App />);
    await user.upload(screen.getByTestId('import-file'), jsonFile(JSON.stringify(importData)));
    await user.click(await screen.findByRole('button', { name: 'キャンセル' }));
    expect(rowTexts()).toEqual(['PBI-1']);
    expect(storedItems().map((p) => p.title)).toEqual(['current']);
  });

  test('不正なファイルは理由を表示し、現在のバックログを変えない', async () => {
    const user = userEvent.setup();
    seed([pbi(1, 'current')]);
    render(<App />);
    await user.upload(screen.getByTestId('import-file'), jsonFile('not json', 'broken.json'));
    expect(await screen.findByRole('alert')).toHaveTextContent('「broken.json」を読み込めませんでした: JSON として読み込めません');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(rowTexts()).toEqual(['PBI-1']);
  });
});

describe('保存失敗', () => {
  test('書き込みに失敗すると、エクスポートへ誘導する警告を出す', async () => {
    const user = userEvent.setup();
    const failing = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('quota', 'QuotaExceededError');
      },
    } as unknown as Storage;
    render(<App storage={failing} />);
    await user.type(screen.getByRole('textbox', { name: '新しい PBI のタイトル' }), 'a{Enter}');
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('ブラウザに保存できませんでした');
    expect(within(alert).getByRole('button', { name: 'エクスポート' })).toBeInTheDocument();
    expect(rowTexts()).toEqual(['PBI-1']);
  });
});

describe('読み込みエラー', () => {
  beforeEach(() => {
    localStorage.setItem(STORAGE_KEY, '{ broken');
  });

  test('理由と選択肢を表示し、選ぶまで保存データを上書きしない', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '保存データを読み込めませんでした' })).toBeInTheDocument();
    expect(screen.getByText('JSON として読み込めません')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '空で始める' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: '新しい PBI のタイトル' })).not.toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{ broken');
  });

  test('空で始めると確認後に空のバックログになり、保存を再開する', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: '空で始める' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '空で始める' }));
    expect(screen.getByText(/PBI はまだありません/)).toBeInTheDocument();
    expect(stored()).toEqual(emptyBacklog());
  });

  test('インポートで復元できる', async () => {
    const user = userEvent.setup();
    render(<App />);
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

function tab(name: string) {
  return screen.getByRole('tab', { name });
}

function tabNames(): string[] {
  return screen.getAllByRole('tab').map((t) => t.textContent ?? '');
}

describe('選択中のプロジェクト', () => {
  test('初めて開くと「マイプロジェクト」のタブだけが選ばれている', () => {
    render(<App />);
    expect(tabNames()).toEqual(['マイプロジェクト']);
    expect(tab('マイプロジェクト')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('マイプロジェクト');
    expect(screen.getByRole('tabpanel', { name: 'マイプロジェクト' })).toBeInTheDocument();
  });

  test('件数と合計は選択中のプロジェクトだけで数える', () => {
    seedTwoProjects([pbi(1, 'a', 3), pbi(2, 'b', 5), pbi(3, 'c')], [pbi(4, 'd', 8)]);
    render(<App />);
    expect(rowTexts()).toEqual(['PBI-1', 'PBI-2', 'PBI-3']);
    expect(screen.getByTestId('backlog-summary')).toHaveTextContent('3 件8 pt');
  });

  test('作成した PBI は選択中のプロジェクトにだけ入り、番号は全体の通し番号になる', async () => {
    const user = userEvent.setup();
    seedTwoProjects([pbi(1, 'a'), pbi(2, 'b')], []);
    localStorage.setItem(ACTIVE_PROJECT_KEY, '2');
    render(<App />);
    await user.type(screen.getByRole('textbox', { name: '新しい PBI のタイトル' }), 'tool の PBI{Enter}');
    expect(rowTexts()).toEqual(['PBI-3']);
    expect(stored().projects.map((p) => p.items.map((i) => i.number))).toEqual([[1, 2], [3]]);
  });

  test('別のプロジェクトの PBI のリンクで開くと、そのプロジェクトが選ばれて詳細が開く', async () => {
    const user = userEvent.setup();
    seedTwoProjects([pbi(1, 'a')], [pbi(3, 'c')]);
    localStorage.setItem(ACTIVE_PROJECT_KEY, '1');
    window.history.replaceState(null, '', '/#PBI-3');
    render(<App />);
    expect(tab('Tool')).toHaveAttribute('aria-selected', 'true');
    expect(rowTexts()).toEqual(['PBI-3']);
    expect(within(screen.getByRole('complementary')).getByRole('heading', { name: 'PBI-3' })).toBeInTheDocument();

    // 詳細を閉じても同じタブに留まり、それを記憶する
    await user.click(screen.getByRole('button', { name: '詳細を閉じる' }));
    expect(tab('Tool')).toHaveAttribute('aria-selected', 'true');
    expect(localStorage.getItem(ACTIVE_PROJECT_KEY)).toBe('2');
  });

  test('無い PBI のリンクでは、記憶したプロジェクトの一覧だけを表示する', () => {
    seedTwoProjects();
    localStorage.setItem(ACTIVE_PROJECT_KEY, '2');
    window.history.replaceState(null, '', '/#PBI-9');
    render(<App />);
    expect(tab('Tool')).toHaveAttribute('aria-selected', 'true');
    expect(rowTexts()).toEqual(['PBI-2']);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  test('記憶したプロジェクトが無くなっていたら最初のタブを表示する', () => {
    seedTwoProjects();
    localStorage.setItem(ACTIVE_PROJECT_KEY, '9');
    render(<App />);
    expect(tab('Web')).toHaveAttribute('aria-selected', 'true');
  });

  test('旧形式（version 1）の保存データで開くと「マイプロジェクト」に PBI が並び、採番が続く', async () => {
    const user = userEvent.setup();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, nextNumber: 4, items: [pbi(1, 'a'), pbi(2, 'b')] }));
    render(<App />);
    expect(tabNames()).toEqual(['マイプロジェクト']);
    expect(rowTexts()).toEqual(['PBI-1', 'PBI-2']);
    await user.type(screen.getByRole('textbox', { name: '新しい PBI のタイトル' }), 'c{Enter}');
    expect(rowTexts()).toEqual(['PBI-1', 'PBI-2', 'PBI-4']);
    expect(stored().version).toBe(2);
  });
});

describe('プロジェクトのタブ', () => {
  test('タブを押すとそのプロジェクトの一覧に切り替わる', async () => {
    const user = userEvent.setup();
    seedTwoProjects();
    render(<App />);
    expect(rowTexts()).toEqual(['PBI-1']);
    await user.click(tab('Tool'));
    expect(rowTexts()).toEqual(['PBI-2']);
    expect(tab('Tool')).toHaveAttribute('aria-selected', 'true');
    expect(tab('Web')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tool');
  });

  test('切り替えると詳細パネルが閉じ、ハッシュが消える', async () => {
    const user = userEvent.setup();
    seedTwoProjects();
    window.history.replaceState(null, '', '/#PBI-1');
    render(<App />);
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    await user.click(tab('Tool'));
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(window.location.hash).toBe('');
  });

  test('右矢印で隣のタブに移って切り替わり、端では反対側に戻る', async () => {
    const user = userEvent.setup();
    seedTwoProjects();
    render(<App />);
    await user.click(tab('Web'));
    await user.keyboard('{ArrowRight}');
    expect(tab('Tool')).toHaveFocus();
    expect(tab('Tool')).toHaveAttribute('aria-selected', 'true');
    expect(rowTexts()).toEqual(['PBI-2']);
    await user.keyboard('{ArrowRight}');
    expect(tab('Web')).toHaveFocus();
    await user.keyboard('{End}');
    expect(tab('Tool')).toHaveAttribute('aria-selected', 'true');
  });

  test('選択中のタブだけが Tab キーで止まる', () => {
    seedTwoProjects();
    render(<App />);
    expect(tab('Web')).toHaveAttribute('tabindex', '0');
    expect(tab('Tool')).toHaveAttribute('tabindex', '-1');
  });

  test('再読み込み後も最後に選んだタブが選ばれる', async () => {
    const user = userEvent.setup();
    seedTwoProjects();
    const first = render(<App />);
    await user.click(tab('Tool'));
    first.unmount();

    render(<App />);
    expect(tab('Tool')).toHaveAttribute('aria-selected', 'true');
    expect(rowTexts()).toEqual(['PBI-2']);
  });
});

describe('プロジェクトの作成', () => {
  test('名前を入れて Enter で末尾に追加し、その空のバックログに切り替わる', async () => {
    const user = userEvent.setup();
    seedTwoProjects();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'プロジェクトを追加' }));
    await user.type(screen.getByRole('textbox', { name: '新しいプロジェクトの名前' }), '  Docs  {Enter}');
    expect(tabNames()).toEqual(['Web', 'Tool', 'Docs']);
    expect(tab('Docs')).toHaveAttribute('aria-selected', 'true');
    expect(tab('Docs')).toHaveFocus();
    expect(screen.getByText(/PBI はまだありません/)).toBeInTheDocument();
    expect(stored().projects.map((p) => p.name)).toEqual(['Web', 'Tool', 'Docs']);
  });

  test('名前が空のまま Enter ではエラーを表示して作成しない', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'プロジェクトを追加' }));
    await user.type(screen.getByRole('textbox', { name: '新しいプロジェクトの名前' }), '   {Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('プロジェクト名を入力してください');
    expect(tabNames()).toEqual(['マイプロジェクト']);
  });

  test('Escape で取り消すと作成しない', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'プロジェクトを追加' }));
    await user.type(screen.getByRole('textbox', { name: '新しいプロジェクトの名前' }), 'Tool{Escape}');
    expect(screen.queryByRole('textbox', { name: '新しいプロジェクトの名前' })).not.toBeInTheDocument();
    expect(tabNames()).toEqual(['マイプロジェクト']);
  });
});

describe('プロジェクトの名前変更', () => {
  test('名前を変えるとタブと見出しが変わり、PBI はそのまま', async () => {
    const user = userEvent.setup();
    seedTwoProjects();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'プロジェクトの名前を変更' }));
    const input = screen.getByRole('textbox', { name: 'プロジェクト名' });
    expect(input).toHaveValue('Web');
    await user.clear(input);
    await user.type(input, 'Web アプリ{Enter}');
    expect(tabNames()).toEqual(['Web アプリ', 'Tool']);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Web アプリ');
    expect(rowTexts()).toEqual(['PBI-1']);
    expect(stored().projects[0]).toMatchObject({ name: 'Web アプリ', items: [pbi(1, 'a')] });
  });

  test('空の名前ではエラーを表示して変えない', async () => {
    const user = userEvent.setup();
    seedTwoProjects();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'プロジェクトの名前を変更' }));
    await user.clear(screen.getByRole('textbox', { name: 'プロジェクト名' }));
    await user.keyboard('{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('プロジェクト名を入力してください');
    expect(stored().projects[0].name).toBe('Web');
  });

  test('Escape で取り消すと変えない', async () => {
    const user = userEvent.setup();
    seedTwoProjects();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'プロジェクトの名前を変更' }));
    await user.type(screen.getByRole('textbox', { name: 'プロジェクト名' }), 'x{Escape}');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Web');
    expect(tabNames()).toEqual(['Web', 'Tool']);
  });
});

describe('プロジェクトの削除', () => {
  function seedThree() {
    seedBacklog(
      backlogOf(['Web', [pbi(1, 'a')]], ['Tool', [pbi(2, 'b'), pbi(3, 'c'), pbi(4, 'd')]], ['Docs', [pbi(5, 'e')]]),
    );
    localStorage.setItem(ACTIVE_PROJECT_KEY, '2');
  }

  test('確認して削除すると PBI ごと消え、左隣に切り替わる', async () => {
    const user = userEvent.setup();
    seedThree();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'プロジェクトを削除' }));
    const dialog = screen.getByRole('alertdialog', { name: 'プロジェクトを削除しますか？' });
    expect(dialog).toHaveTextContent('「Tool」と PBI 3 件を削除します。元に戻せません。');
    await user.click(within(dialog).getByRole('button', { name: '削除する' }));

    expect(tabNames()).toEqual(['Web', 'Docs']);
    expect(tab('Web')).toHaveAttribute('aria-selected', 'true');
    expect(rowTexts()).toEqual(['PBI-1']);
    expect(stored().projects.map((p) => p.items.map((i) => i.number))).toEqual([[1], [5]]);
    expect(stored().nextNumber).toBe(6);
  });

  test('左隣が無いときは右隣に切り替わる', async () => {
    const user = userEvent.setup();
    seedThree();
    localStorage.setItem(ACTIVE_PROJECT_KEY, '1');
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'プロジェクトを削除' }));
    await user.click(screen.getByRole('button', { name: '削除する' }));
    expect(tabNames()).toEqual(['Tool', 'Docs']);
    expect(tab('Tool')).toHaveAttribute('aria-selected', 'true');
  });

  test('確認で取り消すと削除しない', async () => {
    const user = userEvent.setup();
    seedThree();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'プロジェクトを削除' }));
    await user.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(tabNames()).toEqual(['Web', 'Tool', 'Docs']);
    expect(rowTexts()).toEqual(['PBI-2', 'PBI-3', 'PBI-4']);
  });

  test('プロジェクトが1つだけのときは削除できない', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'プロジェクトを削除' })).toBeDisabled();
  });
});

describe('インポート（複数のプロジェクト）', () => {
  test('確認文にプロジェクト数と件数を出し、置き換え後は最初のプロジェクトを選ぶ', async () => {
    const user = userEvent.setup();
    seedTwoProjects();
    localStorage.setItem(ACTIVE_PROJECT_KEY, '2');
    render(<App />);
    const data = { ...backlogOf(['Web', [pbi(1, 'x')]], ['Tool', [pbi(5, 'y')]]), nextNumber: 6 };
    await user.upload(screen.getByTestId('import-file'), new File([JSON.stringify(data)], 'all.json'));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent(
      '現在のデータ（2 プロジェクト・2 件）を、「all.json」の内容（2 プロジェクト・2 件）で置き換えます。',
    );
    await user.click(within(dialog).getByRole('button', { name: '置き換える' }));
    expect(tab('Web')).toHaveAttribute('aria-selected', 'true');
    expect(rowTexts()).toEqual(['PBI-1']);
    await user.type(screen.getByRole('textbox', { name: '新しい PBI のタイトル' }), 'z{Enter}');
    expect(rowTexts()).toEqual(['PBI-1', 'PBI-6']);
  });

  test('別々のプロジェクトに同じ番号がある不正なファイルは読み込まない', async () => {
    const user = userEvent.setup();
    seedTwoProjects();
    render(<App />);
    const data = backlogOf(['Web', [pbi(1, 'x')]], ['Tool', [pbi(1, 'y')]]);
    await user.upload(screen.getByTestId('import-file'), new File([JSON.stringify(data)], 'dup.json'));
    expect(await screen.findByRole('alert')).toHaveTextContent('番号 1 が重複しています');
    expect(tabNames()).toEqual(['Web', 'Tool']);
  });
});
