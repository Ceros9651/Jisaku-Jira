import { pbi } from '../test/backlog';
import type { Backlog } from './model';
import { parseBacklogJson, validateBacklog } from './validate';

function sample(): Backlog {
  return {
    version: 3,
    nextProjectId: 3,
    projects: [
      {
        id: 1,
        name: 'Web',
        nextNumber: 6,
        items: [pbi(5, { status: 'done', storyPoints: 3 }), pbi(1, { description: '説明' })],
      },
      { id: 2, name: 'Tool', nextNumber: 3, items: [pbi(2)] },
    ],
  };
}

type Data = Record<string, unknown>;

function version1(): Data {
  return { version: 1, nextNumber: 4, items: [pbi(2), pbi(1, { description: '説明' })] };
}

const at = (minute: number) => `2026-10-01T00:${String(minute).padStart(2, '0')}:00.000Z`;

/** 番号が全プロジェクトの通し番号だった形式。Yarikuri の並び順は作成順と違う */
function version2(): Data {
  return {
    version: 2,
    nextNumber: 13,
    nextProjectId: 3,
    projects: [
      {
        id: 1,
        name: 'Jisaku-Jira-App',
        items: [...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => pbi(n, { createdAt: at(n) })), pbi(11, { createdAt: at(11) })],
      },
      { id: 2, name: 'Yarikuri', items: [pbi(12, { createdAt: at(12) }), pbi(10, { createdAt: at(10) })] },
    ],
  };
}

const projectsOf = (b: Data) => b.projects as Data[];
const withProject = (b: Data, index: number, change: Data): Data => ({
  ...b,
  projects: projectsOf(b).map((p, i) => (i === index ? { ...p, ...change } : p)),
});
const withItem = (b: Data, change: Data): Data =>
  withProject(b, 0, { items: [{ ...(projectsOf(b)[0].items as Data[])[0], ...change }] });

test('正常なデータはそのまま受け付け、プロジェクトと PBI の順序を保つ', () => {
  expect(validateBacklog(sample())).toEqual({ ok: true, backlog: sample() });
});

test('保存した文字列をそのまま読み込める', () => {
  expect(parseBacklogJson(JSON.stringify(sample(), null, 2))).toEqual({ ok: true, backlog: sample() });
});

test('JSON として読めない文字列は拒否する', () => {
  expect(parseBacklogJson('{ not json')).toEqual({ ok: false, reason: 'JSON として読み込めません' });
});

test('プロジェクトの nextNumber と nextProjectId が既存の最大値以下なら最大値＋1に補正する', () => {
  const data = withProject({ ...(sample() as unknown as Data), nextProjectId: 1 }, 0, { nextNumber: 2 });
  const result = validateBacklog(data);
  expect(result.ok && [result.backlog.projects[0].nextNumber, result.backlog.nextProjectId]).toEqual([6, 3]);
});

test('プロジェクト名の前後の空白は取り除く', () => {
  const result = validateBacklog(withProject(sample() as unknown as Data, 0, { name: '  Web  ' }));
  expect(result.ok && result.backlog.projects[0].name).toBe('Web');
});

test('別々のプロジェクトに同じ番号の PBI があってもよい', () => {
  const result = validateBacklog(withProject(sample() as unknown as Data, 1, { items: [pbi(1), pbi(5)] }));
  expect(result.ok && result.backlog.projects[1].items.map((p) => p.number)).toEqual([1, 5]);
});

test('1つのプロジェクトの中で番号が重複していれば、理由に番号を示して拒否する', () => {
  const result = validateBacklog(withProject(sample() as unknown as Data, 1, { items: [pbi(2), pbi(2)] }));
  expect(result).toEqual({ ok: false, reason: '番号 2 が重複しています' });
});

describe('version 1', () => {
  test('PBI を順序のまま「マイプロジェクト」1つに入れ、nextNumber を変えない', () => {
    expect(validateBacklog(version1())).toEqual({
      ok: true,
      backlog: {
        version: 3,
        nextProjectId: 2,
        projects: [{ id: 1, name: 'マイプロジェクト', nextNumber: 4, items: [pbi(2), pbi(1, { description: '説明' })] }],
      },
    });
  });

  test('PBI が空でも変換する', () => {
    const result = validateBacklog({ version: 1, nextNumber: 1, items: [] });
    expect(result.ok && result.backlog.projects).toEqual([{ id: 1, name: 'マイプロジェクト', nextNumber: 1, items: [] }]);
  });

  test.each<[string, (b: Data) => unknown]>([
    ['items がない', ({ items: _, ...rest }) => rest],
    ['番号が重複', (b) => ({ ...b, items: [pbi(1), pbi(1)] })],
    ['title が空', (b) => ({ ...b, items: [pbi(1, { title: ' ' })] })],
  ])('%s データは拒否する', (_, mutate) => {
    expect(validateBacklog(mutate(version1())).ok).toBe(false);
  });
});

describe('version 2', () => {
  test('最初のプロジェクトは番号を変えず、次の番号は全体の nextNumber を引き継ぐ', () => {
    const result = validateBacklog(version2());
    if (!result.ok) throw new Error(result.reason);
    const [app] = result.backlog.projects;
    expect(app.items.map((p) => p.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 11]);
    expect(app.nextNumber).toBe(13);
  });

  test('2つ目以降は並び順を変えずに作成日時の順で 1 から振り直す', () => {
    const result = validateBacklog(version2());
    if (!result.ok) throw new Error(result.reason);
    const yarikuri = result.backlog.projects[1];
    // 並び順は 12, 10 のまま。作成日時は 10 が古いので 10 → 1、12 → 2
    expect(yarikuri.items.map((p) => [p.createdAt, p.number])).toEqual([
      [at(12), 2],
      [at(10), 1],
    ]);
    expect(yarikuri.nextNumber).toBe(3);
  });

  test('作成日時が同じときは元の番号の順にする', () => {
    const data = withProject(version2(), 1, { items: [pbi(12, { title: 'B' }), pbi(10, { title: 'A' })] });
    const result = validateBacklog(data);
    expect(result.ok && result.backlog.projects[1].items.map((p) => [p.title, p.number])).toEqual([
      ['B', 2],
      ['A', 1],
    ]);
  });

  test('番号以外の内容、プロジェクトとその順序は変えない', () => {
    const result = validateBacklog(version2());
    if (!result.ok) throw new Error(result.reason);
    expect(result.backlog.version).toBe(3);
    expect(result.backlog.nextProjectId).toBe(3);
    expect(result.backlog.projects.map((p) => [p.id, p.name])).toEqual([
      [1, 'Jisaku-Jira-App'],
      [2, 'Yarikuri'],
    ]);
    expect(result.backlog.projects[1].items.map(({ number: _, ...rest }) => rest)).toEqual(
      (projectsOf(version2())[1].items as Data[]).map(({ number: _, ...rest }) => rest),
    );
  });

  test('同じ入力からは何度変換しても同じ結果になる', () => {
    expect(validateBacklog(version2())).toEqual(validateBacklog(version2()));
  });

  test('振り直した結果を保存して読み直しても番号は変わらない', () => {
    const result = validateBacklog(version2());
    if (!result.ok) throw new Error(result.reason);
    expect(parseBacklogJson(JSON.stringify(result.backlog))).toEqual(result);
  });

  test('プロジェクトをまたいで番号が重複していれば、理由に番号を示して拒否する', () => {
    const result = validateBacklog(withProject(version2(), 1, { items: [pbi(5)] }));
    expect(result).toEqual({ ok: false, reason: '番号 5 が重複しています' });
  });

  test('nextNumber がないデータは拒否する', () => {
    const { nextNumber: _, ...rest } = version2();
    expect(validateBacklog(rest).ok).toBe(false);
  });
});

test.each<[string, (b: Data) => unknown]>([
  ['オブジェクトでない', () => []],
  ['未対応の version', (b) => ({ ...b, version: 4 })],
  ['projects がない', ({ projects: _, ...rest }) => rest],
  ['projects が空', (b) => ({ ...b, projects: [] })],
  ['nextProjectId がない', ({ nextProjectId: _, ...rest }) => rest],
  ['プロジェクトの nextNumber がない', (b) => withProject(b, 0, { nextNumber: undefined })],
  ['プロジェクトの name が空', (b) => withProject(b, 0, { name: '  ' })],
  ['プロジェクトの id が重複', (b) => withProject(b, 1, { id: 1 })],
  ['プロジェクトの items がない', (b) => withProject(b, 0, { items: undefined })],
  ['title が欠けている', (b) => withItem(b, { title: undefined })],
  ['status が不正', (b) => withItem(b, { status: 'doing' })],
  ['storyPoints が小数', (b) => withItem(b, { storyPoints: 2.5 })],
  ['number が 0', (b) => withItem(b, { number: 0 })],
])('%s データは拒否する', (_, mutate) => {
  expect(validateBacklog(mutate(sample() as unknown as Data)).ok).toBe(false);
});

describe('受入条件', () => {
  const omitCriteria = ({ acceptanceCriteria: _, ...rest }: Data) => rest;

  test('項目が無い PBI は受入条件を空として読み、他の項目と順序は変えない', () => {
    const b = sample() as unknown as Data;
    const data = {
      ...b,
      projects: projectsOf(b).map((p) => ({ ...p, items: (p.items as Data[]).map(omitCriteria) })),
    };
    expect(validateBacklog(data)).toEqual({ ok: true, backlog: sample() });
  });

  test('項目が無い version 2 の PBI は受入条件を空として読む', () => {
    const b = version2();
    const data = {
      ...b,
      projects: projectsOf(b).map((p) => ({ ...p, items: (p.items as Data[]).map(omitCriteria) })),
    };
    const result = validateBacklog(data);
    expect(result.ok && result.backlog.projects.flatMap((p) => p.items.map((i) => i.acceptanceCriteria))).toEqual(
      Array(12).fill(''),
    );
  });

  test('項目が無い version 1 の PBI は受入条件を空として読む', () => {
    const data = { ...version1(), items: (version1().items as Data[]).map(omitCriteria) };
    const result = validateBacklog(data);
    expect(result.ok && result.backlog.projects[0].items.map((p) => p.acceptanceCriteria)).toEqual(['', '']);
  });

  test('受入条件があれば値をそのまま保つ', () => {
    const result = validateBacklog(withItem(sample() as unknown as Data, { acceptanceCriteria: '- 1つ目\n- 2つ目\n' }));
    expect(result.ok && result.backlog.projects[0].items[0].acceptanceCriteria).toBe('- 1つ目\n- 2つ目\n');
  });

  test('受入条件が数値なら理由を示して拒否する', () => {
    expect(validateBacklog(withItem(sample() as unknown as Data, { acceptanceCriteria: 1 }))).toEqual({
      ok: false,
      reason: '1 番目のプロジェクトの1 件目の acceptanceCriteria が文字列ではありません',
    });
  });
});
