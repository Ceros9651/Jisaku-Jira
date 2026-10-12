import { act, renderHook } from '@testing-library/react';
import { emptyBacklog, formatPbiId } from './model';
import { backlogReducer } from './reducer';
import { serializeBacklog } from './storage';
import { exportFileName, readBacklogFile } from './transfer';
import { useBacklog } from './useBacklog';

const now = '2026-10-12T00:00:00.000Z';

function file(text: string): Blob {
  return new Blob([text], { type: 'application/json' });
}

test('エクスポートした内容を読み込むと同じバックログになる', async () => {
  let backlog = emptyBacklog();
  for (const title of ['a', 'b']) backlog = backlogReducer(backlog, { type: 'create', title, now });
  expect(await readBacklogFile(file(serializeBacklog(backlog)))).toEqual({ ok: true, backlog });
});

test('インポート後の採番はファイルの nextNumber から続く', async () => {
  const data = {
    version: 1,
    nextNumber: 6,
    items: [1, 5].map((number) => ({
      number,
      title: `t${number}`,
      description: '',
      status: 'todo',
      storyPoints: null,
      createdAt: now,
      updatedAt: now,
    })),
  };
  const result = await readBacklogFile(file(JSON.stringify(data)));
  if (!result.ok) throw new Error(result.reason);

  const { result: store } = renderHook(() => useBacklog(localStorage));
  act(() => store.current.replace(result.backlog));
  act(() => store.current.dispatch({ type: 'create', title: 'new', now }));
  expect(store.current.backlog.items.map((p) => formatPbiId(p.number))).toEqual(['PBI-1', 'PBI-5', 'PBI-6']);
});

test('不正なファイルは理由を返し、現在のデータは変わらない', async () => {
  const { result: store } = renderHook(() => useBacklog(localStorage));
  act(() => store.current.dispatch({ type: 'create', title: 'keep', now }));
  const before = store.current.backlog;

  const result = await readBacklogFile(file('not json'));
  expect(result).toEqual({ ok: false, reason: 'JSON として読み込めません' });
  expect(store.current.backlog).toBe(before);
});

test('ファイル名に日付が入る', () => {
  expect(exportFileName(new Date(2026, 9, 2))).toBe('jisaku-jira-backlog-20261002.json');
});
