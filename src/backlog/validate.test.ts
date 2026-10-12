import { pbi } from '../test/backlog';
import type { Backlog } from './model';
import { parseBacklogJson, validateBacklog } from './validate';

function sample(): Backlog {
  return {
    version: 2,
    nextNumber: 6,
    nextProjectId: 3,
    projects: [
      { id: 1, name: 'Web', items: [pbi(5, { status: 'done', storyPoints: 3 }), pbi(1, { description: '説明' })] },
      { id: 2, name: 'Tool', items: [pbi(2)] },
    ],
  };
}

type Data = Record<string, unknown>;

function version1(): Data {
  return { version: 1, nextNumber: 4, items: [pbi(2), pbi(1, { description: '説明' })] };
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

test('JSON として読めない文字列は拒否する', () => {
  expect(parseBacklogJson('{ not json')).toEqual({ ok: false, reason: 'JSON として読み込めません' });
});

test('nextNumber と nextProjectId が既存の最大値以下なら最大値＋1に補正する', () => {
  const result = validateBacklog({ ...sample(), nextNumber: 2, nextProjectId: 1 });
  expect(result.ok && [result.backlog.nextNumber, result.backlog.nextProjectId]).toEqual([6, 3]);
});

test('プロジェクト名の前後の空白は取り除く', () => {
  const result = validateBacklog(withProject(sample() as unknown as Data, 0, { name: '  Web  ' }));
  expect(result.ok && result.backlog.projects[0].name).toBe('Web');
});

describe('version 1', () => {
  test('PBI を順序のまま「マイプロジェクト」1つに入れ、nextNumber を変えない', () => {
    expect(validateBacklog(version1())).toEqual({
      ok: true,
      backlog: {
        version: 2,
        nextNumber: 4,
        nextProjectId: 2,
        projects: [{ id: 1, name: 'マイプロジェクト', items: [pbi(2), pbi(1, { description: '説明' })] }],
      },
    });
  });

  test('PBI が空でも変換する', () => {
    const result = validateBacklog({ version: 1, nextNumber: 1, items: [] });
    expect(result.ok && result.backlog.projects).toEqual([{ id: 1, name: 'マイプロジェクト', items: [] }]);
  });

  test.each<[string, (b: Data) => unknown]>([
    ['items がない', ({ items: _, ...rest }) => rest],
    ['番号が重複', (b) => ({ ...b, items: [pbi(1), pbi(1)] })],
    ['title が空', (b) => ({ ...b, items: [pbi(1, { title: ' ' })] })],
  ])('%s データは拒否する', (_, mutate) => {
    expect(validateBacklog(mutate(version1())).ok).toBe(false);
  });
});

test.each<[string, (b: Data) => unknown]>([
  ['オブジェクトでない', () => []],
  ['未対応の version', (b) => ({ ...b, version: 3 })],
  ['projects がない', ({ projects: _, ...rest }) => rest],
  ['projects が空', (b) => ({ ...b, projects: [] })],
  ['nextNumber がない', ({ nextNumber: _, ...rest }) => rest],
  ['nextProjectId がない', ({ nextProjectId: _, ...rest }) => rest],
  ['プロジェクトの name が空', (b) => withProject(b, 0, { name: '  ' })],
  ['プロジェクトの id が重複', (b) => withProject(b, 1, { id: 1 })],
  ['プロジェクトの items がない', (b) => withProject(b, 0, { items: undefined })],
  ['プロジェクトをまたいで番号が重複', (b) => withProject(b, 1, { items: [pbi(5)] })],
  ['title が欠けている', (b) => withItem(b, { title: undefined })],
  ['status が不正', (b) => withItem(b, { status: 'doing' })],
  ['storyPoints が小数', (b) => withItem(b, { storyPoints: 2.5 })],
  ['number が 0', (b) => withItem(b, { number: 0 })],
])('%s データは拒否する', (_, mutate) => {
  expect(validateBacklog(mutate(sample() as unknown as Data)).ok).toBe(false);
});

test('プロジェクトをまたぐ番号の重複は理由に番号を示す', () => {
  const result = validateBacklog(withProject(sample() as unknown as Data, 1, { items: [pbi(5)] }));
  expect(result).toEqual({ ok: false, reason: '番号 5 が重複しています' });
});
