import { type Backlog, emptyBacklog, formatPbiId, parseStoryPointsInput } from './model';
import { type BacklogAction, backlogReducer } from './reducer';

const now = '2026-10-12T00:00:00.000Z';
const later = '2026-10-13T00:00:00.000Z';

function run(actions: BacklogAction[], start: Backlog = emptyBacklog()): Backlog {
  return actions.reduce(backlogReducer, start);
}

/** 既定ではプロジェクト id 1（emptyBacklog の「マイプロジェクト」）に作る */
function create(title: string, projectId = 1): BacklogAction {
  return { type: 'create', projectId, title, now };
}

function ids(backlog: Backlog, projectId = 1): string[] {
  return items(backlog, projectId).map((p) => formatPbiId(p.number));
}

function items(backlog: Backlog, projectId = 1) {
  const project = backlog.projects.find((p) => p.id === projectId);
  if (!project) throw new Error(`project ${projectId} がありません`);
  return project.items;
}

/** 「マイプロジェクト」(1) と「Tool」(2) の2つを持つバックログ */
const twoProjects = () => run([{ type: 'createProject', name: 'Tool' }]);

describe('PBI の作成', () => {
  test('タイトルだけで作成すると末尾に To Do で追加される', () => {
    const backlog = run([create('既存'), create('ログイン画面を作る')]);
    expect(items(backlog)[1]).toEqual({
      number: 2,
      title: 'ログイン画面を作る',
      description: '',
      acceptanceCriteria: '',
      status: 'todo',
      storyPoints: null,
      createdAt: now,
      updatedAt: now,
    });
  });

  test('タイトルの前後の空白は取り除く', () => {
    expect(items(run([create('  タイトル  ')]))[0].title).toBe('タイトル');
  });

  test.each(['', '   '])('タイトルが空 (%j) のときは作成しない', (title) => {
    const start = emptyBacklog();
    expect(backlogReducer(start, create(title))).toBe(start);
  });

  test('指定したプロジェクトにだけ追加される', () => {
    const backlog = run([create('tool の PBI', 2)], twoProjects());
    expect(ids(backlog, 2)).toEqual(['PBI-1']);
    expect(ids(backlog, 1)).toEqual([]);
  });

  test('無いプロジェクトへの作成は無視する', () => {
    const start = emptyBacklog();
    expect(backlogReducer(start, create('a', 99))).toBe(start);
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
    expect(items(backlog).map((p) => p.title)).toEqual(['b', 'a', 'c']);
  });

  test('プロジェクトをまたいで通し番号になる', () => {
    const backlog = run([create('a', 1), create('b', 1), create('c', 2)], twoProjects());
    expect(ids(backlog, 1)).toEqual(['PBI-1', 'PBI-2']);
    expect(ids(backlog, 2)).toEqual(['PBI-3']);
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
    expect(items(backlog)[1]).toMatchObject({ title: '新しいタイトル', description: '説明', updatedAt: later });
  });

  test('受入条件だけを変更すると、他の項目は変わらず updatedAt が進む', () => {
    const acceptanceCriteria = '- ログインできる\n- 誤ったパスワードではエラーが出る';
    const backlog = backlogReducer(base, { type: 'update', number: 2, changes: { acceptanceCriteria }, now: later });
    expect(items(backlog)[1]).toEqual({ ...items(base)[1], acceptanceCriteria, updatedAt: later });
  });

  test('タイトルを空にする変更は保存しない', () => {
    expect(backlogReducer(base, { type: 'update', number: 2, changes: { title: ' ' }, now: later })).toBe(base);
  });

  test('ステータスを In Progress に変更できる', () => {
    const backlog = backlogReducer(base, { type: 'update', number: 1, changes: { status: 'in_progress' }, now });
    expect(items(backlog)[0].status).toBe('in_progress');
  });

  test('ストーリーポイントを 5 にしてから未設定に戻せる', () => {
    const set = backlogReducer(base, { type: 'update', number: 1, changes: { storyPoints: 5 }, now });
    expect(items(set)[0].storyPoints).toBe(5);
    const cleared = backlogReducer(set, { type: 'update', number: 1, changes: { storyPoints: null }, now });
    expect(items(cleared)[0].storyPoints).toBeNull();
  });

  test.each([-1, 2.5, Number.NaN])('不正なストーリーポイント %s は保存しない', (storyPoints) => {
    expect(backlogReducer(base, { type: 'update', number: 1, changes: { storyPoints }, now })).toBe(base);
  });

  test('存在しない番号の更新は無視する', () => {
    expect(backlogReducer(base, { type: 'update', number: 99, changes: { title: 'x' }, now })).toBe(base);
  });

  test('別のプロジェクトの PBI も番号で更新できる', () => {
    const start = run([create('a', 1), create('b', 2)], twoProjects());
    const backlog = backlogReducer(start, { type: 'update', number: 2, changes: { status: 'done' }, now });
    expect(items(backlog, 2)[0].status).toBe('done');
    expect(items(backlog, 1)).toBe(items(start, 1));
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

  test('存在しない番号の削除は無視する', () => {
    const start = run([create('a')]);
    expect(backlogReducer(start, { type: 'delete', number: 99 })).toBe(start);
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

  test('移動はそのプロジェクトの中だけで、他のプロジェクトの順序は変わらない', () => {
    const start = run([create('a', 1), create('b', 1), create('c', 2), create('d', 2)], twoProjects());
    const backlog = backlogReducer(start, { type: 'move', number: 4, toIndex: 0 });
    expect(ids(backlog, 2)).toEqual(['PBI-4', 'PBI-3']);
    expect(ids(backlog, 1)).toEqual(['PBI-1', 'PBI-2']);
  });

  // 未完了の一覧からは、ドロップ先の PBI の全体の位置を toIndex に渡す
  describe('間に Done の PBI があるとき（全体 1, 2(Done), 3）', () => {
    const withDone = backlogReducer(base, { type: 'update', number: 2, changes: { status: 'done' }, now });

    test('3 を 1 の位置へ移すと 3, 1, 2 になる', () => {
      expect(ids(backlogReducer(withDone, { type: 'move', number: 3, toIndex: 0 }))).toEqual([
        'PBI-3',
        'PBI-1',
        'PBI-2',
      ]);
    });

    test('1 を 3 の位置へ移すと 2, 3, 1 になり、未完了どうしは 3, 1 の順になる', () => {
      expect(ids(backlogReducer(withDone, { type: 'move', number: 1, toIndex: 2 }))).toEqual([
        'PBI-2',
        'PBI-3',
        'PBI-1',
      ]);
    });
  });
});

describe('プロジェクト', () => {
  test('作成すると末尾に空のプロジェクトが nextProjectId の id で追加される', () => {
    const backlog = run([{ type: 'createProject', name: '  Tool  ' }]);
    expect(backlog.projects.map((p) => [p.id, p.name])).toEqual([
      [1, 'マイプロジェクト'],
      [2, 'Tool'],
    ]);
    expect(items(backlog, 2)).toEqual([]);
    expect(backlog.nextProjectId).toBe(3);
  });

  test.each(['', '   '])('名前が空 (%j) のときは作成しない', (name) => {
    const start = emptyBacklog();
    expect(backlogReducer(start, { type: 'createProject', name })).toBe(start);
  });

  test('名前を変えても PBI は変わらない', () => {
    const start = run([create('a'), create('b')]);
    const backlog = backlogReducer(start, { type: 'renameProject', id: 1, name: ' Web アプリ ' });
    expect(backlog.projects[0].name).toBe('Web アプリ');
    expect(items(backlog)).toBe(items(start));
  });

  test('空の名前・無い id への名前変更は無視する', () => {
    const start = emptyBacklog();
    expect(backlogReducer(start, { type: 'renameProject', id: 1, name: ' ' })).toBe(start);
    expect(backlogReducer(start, { type: 'renameProject', id: 99, name: 'x' })).toBe(start);
  });

  test('削除するとそのプロジェクトの PBI ごと消え、他のプロジェクトは残る', () => {
    const start = run([create('a', 1), create('b', 2), create('c', 2)], twoProjects());
    const backlog = backlogReducer(start, { type: 'deleteProject', id: 2 });
    expect(backlog.projects.map((p) => p.name)).toEqual(['マイプロジェクト']);
    expect(ids(backlog, 1)).toEqual(['PBI-1']);
  });

  test('削除したプロジェクトの PBI 番号も再利用しない', () => {
    const backlog = run(
      [create('a', 2), create('b', 2), { type: 'deleteProject', id: 2 }, create('c', 1)],
      twoProjects(),
    );
    expect(ids(backlog, 1)).toEqual(['PBI-3']);
  });

  test('削除したプロジェクトの id も再利用しない', () => {
    const backlog = run(
      [{ type: 'deleteProject', id: 2 }, { type: 'createProject', name: 'Docs' }],
      twoProjects(),
    );
    expect(backlog.projects.map((p) => p.id)).toEqual([1, 3]);
  });

  test('最後の1つと無い id の削除は無視する', () => {
    const start = emptyBacklog();
    expect(backlogReducer(start, { type: 'deleteProject', id: 1 })).toBe(start);
    const two = twoProjects();
    expect(backlogReducer(two, { type: 'deleteProject', id: 99 })).toBe(two);
  });
});
