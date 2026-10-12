import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import type { Backlog, Pbi } from './backlog/model';
import { STORAGE_KEY, loadBacklog } from './backlog/storage';

const now = '2026-10-12T00:00:00.000Z';

function pbi(number: number, title: string, storyPoints: number | null = null): Pbi {
  return { number, title, description: '', status: 'todo', storyPoints, createdAt: now, updatedAt: now };
}

function seed(items: Pbi[], nextNumber = Math.max(0, ...items.map((p) => p.number)) + 1) {
  const backlog: Backlog = { version: 1, nextNumber, items };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(backlog));
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
    expect(stored().items[0].status).toBe('in_progress');
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
    expect(stored().items[1]).toMatchObject({ number: 2, title: '新しいタイトル', description: '詳しい説明', storyPoints: 5 });
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
    expect(stored().items[0].storyPoints).toBeNull();
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
    expect(stored().items[0]).toMatchObject({ title: 'a', storyPoints: null });
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
  const importData: Backlog = { version: 1, nextNumber: 6, items: [pbi(1, 'x'), pbi(5, 'y')] };
  const jsonFile = (text: string, name = 'backup.json') => new File([text], name, { type: 'application/json' });

  test('確認するとバックログを置き換え、採番はファイルの nextNumber から続く', async () => {
    const user = userEvent.setup();
    seed([pbi(1, 'current')]);
    render(<App />);
    await user.upload(screen.getByTestId('import-file'), jsonFile(JSON.stringify(importData)));
    const dialog = await screen.findByRole('alertdialog', { name: 'バックログを置き換えますか？' });
    expect(dialog).toHaveTextContent('現在のバックログ（1 件）を、「backup.json」の内容（2 件）で置き換えます。');
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
    expect(stored().items.map((p) => p.title)).toEqual(['current']);
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
    expect(stored()).toEqual({ version: 1, nextNumber: 1, items: [] });
  });

  test('インポートで復元できる', async () => {
    const user = userEvent.setup();
    render(<App />);
    const data: Backlog = { version: 1, nextNumber: 3, items: [pbi(2, 'restored')] };
    await user.upload(screen.getByTestId('import-file'), new File([JSON.stringify(data)], 'b.json'));
    await user.click(await screen.findByRole('button', { name: '置き換える' }));
    expect(rowTexts()).toEqual(['PBI-2']);
    expect(stored()).toEqual(data);
  });
});
