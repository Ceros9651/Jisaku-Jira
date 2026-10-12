import type { Backlog } from './model';
import { parseBacklogJson, validateBacklog } from './validate';

function sample(): Backlog {
  return {
    version: 1,
    nextNumber: 6,
    items: [
      {
        number: 5,
        title: 'b',
        description: '',
        status: 'done',
        storyPoints: 3,
        createdAt: '2026-10-12T00:00:00.000Z',
        updatedAt: '2026-10-12T00:00:00.000Z',
      },
      {
        number: 1,
        title: 'a',
        description: '説明',
        status: 'todo',
        storyPoints: null,
        createdAt: '2026-10-12T00:00:00.000Z',
        updatedAt: '2026-10-12T00:00:00.000Z',
      },
    ],
  };
}

test('正常なデータはそのまま受け付け、順序を保つ', () => {
  const result = validateBacklog(sample());
  expect(result).toEqual({ ok: true, backlog: sample() });
});

test('JSON として読めない文字列は拒否する', () => {
  expect(parseBacklogJson('{ not json')).toEqual({ ok: false, reason: 'JSON として読み込めません' });
});

test('nextNumber が既存の最大番号以下なら最大番号＋1に補正する', () => {
  const data = { ...sample(), nextNumber: 2 };
  const result = validateBacklog(data);
  expect(result.ok && result.backlog.nextNumber).toBe(6);
});

test.each<[string, (b: Record<string, unknown>) => unknown]>([
  ['オブジェクトでない', () => []],
  ['version が違う', (b) => ({ ...b, version: 2 })],
  ['items がない', ({ items: _, ...rest }) => rest],
  ['nextNumber がない', ({ nextNumber: _, ...rest }) => rest],
  ['title が欠けている', (b) => ({ ...b, items: [{ ...(b.items as object[])[0], title: undefined }] })],
  ['title が空', (b) => ({ ...b, items: [{ ...(b.items as object[])[0], title: '  ' }] })],
  ['status が不正', (b) => ({ ...b, items: [{ ...(b.items as object[])[0], status: 'doing' }] })],
  ['storyPoints が負', (b) => ({ ...b, items: [{ ...(b.items as object[])[0], storyPoints: -1 }] })],
  ['storyPoints が小数', (b) => ({ ...b, items: [{ ...(b.items as object[])[0], storyPoints: 2.5 }] })],
  ['number が 0', (b) => ({ ...b, items: [{ ...(b.items as object[])[0], number: 0 }] })],
  ['番号が重複', (b) => ({ ...b, items: [(b.items as object[])[0], (b.items as object[])[0]] })],
])('%s データは拒否する', (_, mutate) => {
  const result = validateBacklog(mutate(sample() as unknown as Record<string, unknown>));
  expect(result.ok).toBe(false);
});
