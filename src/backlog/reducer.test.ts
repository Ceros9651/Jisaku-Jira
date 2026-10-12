import { type Backlog, emptyBacklog, formatPbiId, parseStoryPointsInput } from './model';
import { type BacklogAction, backlogReducer } from './reducer';

const now = '2026-10-12T00:00:00.000Z';
const later = '2026-10-13T00:00:00.000Z';

function run(actions: BacklogAction[], start: Backlog = emptyBacklog()): Backlog {
  return actions.reduce(backlogReducer, start);
}

function create(title: string): BacklogAction {
  return { type: 'create', title, now };
}

function ids(backlog: Backlog): string[] {
  return backlog.items.map((p) => formatPbiId(p.number));
}

describe('PBI の作成', () => {
  test('タイトルだけで作成すると末尾に To Do で追加される', () => {
    const backlog = run([create('既存'), create('ログイン画面を作る')]);
    expect(backlog.items[1]).toEqual({
      number: 2,
      title: 'ログイン画面を作る',
      description: '',
      status: 'todo',
      storyPoints: null,
      createdAt: now,
      updatedAt: now,
    });
  });

  test('タイトルの前後の空白は取り除く', () => {
    expect(run([create('  タイトル  ')]).items[0].title).toBe('タイトル');
  });

  test.each(['', '   '])('タイトルが空 (%j) のときは作成しない', (title) => {
    const start = emptyBacklog();
    expect(backlogReducer(start, create(title))).toBe(start);
  });
});

describe('PBI の ID 採番', () => {
  test('最初の PBI は PBI-1', () => {
    expect(ids(run([create('a')]))).toEqual(['PBI-1']);
  });

  test('続けて作成すると PBI-3', () => {
    expect(ids(run([create('a'), create('b'), create('c')]))).toEqual(['PBI-1', 'PBI-2', 'PBI-3']);
  });

  test('削除した番号は欠番になる', () => {
    const backlog = run([create('a'), create('b'), create('c'), { type: 'delete', number: 3 }, create('d')]);
    expect(ids(backlog)).toEqual(['PBI-1', 'PBI-2', 'PBI-4']);
  });

  test('並べ替えても ID は変わらない', () => {
    const backlog = run([create('a'), create('b'), create('c'), { type: 'move', number: 2, toIndex: 0 }]);
    expect(ids(backlog)).toEqual(['PBI-2', 'PBI-1', 'PBI-3']);
    expect(backlog.items.map((p) => p.title)).toEqual(['b', 'a', 'c']);
  });
});

describe('PBI の更新', () => {
  const base = run([create('a'), create('b'), create('c')]);

  test('タイトルと説明を変更しても ID と位置は変わらない', () => {
    const backlog = backlogReducer(base, {
      type: 'update',
      number: 2,
      changes: { title: '新しいタイトル', description: '説明' },
      now: later,
    });
    expect(ids(backlog)).toEqual(['PBI-1', 'PBI-2', 'PBI-3']);
    expect(backlog.items[1]).toMatchObject({ title: '新しいタイトル', description: '説明', updatedAt: later });
  });

  test('タイトルを空にする変更は保存しない', () => {
    expect(backlogReducer(base, { type: 'update', number: 2, changes: { title: ' ' }, now: later })).toBe(base);
  });

  test('ステータスを In Progress に変更できる', () => {
    const backlog = backlogReducer(base, { type: 'update', number: 1, changes: { status: 'in_progress' }, now });
    expect(backlog.items[0].status).toBe('in_progress');
  });

  test('ストーリーポイントを 5 にしてから未設定に戻せる', () => {
    const set = backlogReducer(base, { type: 'update', number: 1, changes: { storyPoints: 5 }, now });
    expect(set.items[0].storyPoints).toBe(5);
    const cleared = backlogReducer(set, { type: 'update', number: 1, changes: { storyPoints: null }, now });
    expect(cleared.items[0].storyPoints).toBeNull();
  });

  test.each([-1, 2.5, Number.NaN])('不正なストーリーポイント %s は保存しない', (storyPoints) => {
    expect(backlogReducer(base, { type: 'update', number: 1, changes: { storyPoints }, now })).toBe(base);
  });

  test('存在しない番号の更新は無視する', () => {
    expect(backlogReducer(base, { type: 'update', number: 99, changes: { title: 'x' }, now })).toBe(base);
  });
});

describe('ストーリーポイントの入力', () => {
  test.each([
    ['5', 5],
    ['0', 0],
    [' 8 ', 8],
    ['', null],
    ['  ', null],
    ['-1', undefined],
    ['2.5', undefined],
    ['abc', undefined],
  ])('%j → %s', (input, expected) => {
    expect(parseStoryPointsInput(input)).toBe(expected);
  });
});

describe('PBI の削除', () => {
  test('削除しても他の PBI の順序は保たれる', () => {
    const backlog = run([
      create('a'),
      create('b'),
      create('c'),
      { type: 'move', number: 3, toIndex: 0 },
      { type: 'delete', number: 1 },
    ]);
    expect(ids(backlog)).toEqual(['PBI-3', 'PBI-2']);
    expect(backlog.nextNumber).toBe(4);
  });

  test('最後の PBI を削除しても番号は再利用しない', () => {
    const backlog = run([create('a'), { type: 'delete', number: 1 }, create('b')]);
    expect(ids(backlog)).toEqual(['PBI-2']);
  });
});

describe('PBI の移動', () => {
  const base = run([create('a'), create('b'), create('c')]);

  test('PBI-3 を先頭へ移すと 3, 1, 2 になる', () => {
    expect(ids(backlogReducer(base, { type: 'move', number: 3, toIndex: 0 }))).toEqual(['PBI-3', 'PBI-1', 'PBI-2']);
  });

  test('PBI-1 を1つ下へ移すと直後と入れ替わる', () => {
    expect(ids(backlogReducer(base, { type: 'move', number: 1, toIndex: 1 }))).toEqual(['PBI-2', 'PBI-1', 'PBI-3']);
  });

  test('範囲外の位置は端に丸める', () => {
    expect(ids(backlogReducer(base, { type: 'move', number: 1, toIndex: 10 }))).toEqual(['PBI-2', 'PBI-3', 'PBI-1']);
  });
});
