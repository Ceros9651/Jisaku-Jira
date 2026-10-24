import { act, renderHook } from '@testing-library/react';
import { pbi, singleProject } from '../test/backlog';
import { emptyBacklog, formatPbiId } from './model';
import { backlogReducer } from './reducer';
import { serializeBacklog } from './storage';
import { exportFileName, readBacklogFile } from './transfer';
import { useBacklog } from './useBacklog';
import { FakeRemote } from '../test/remote';

const now = '2026-10-12T00:00:00.000Z';

function file(text: string): Blob {
  return new Blob([text], { type: 'application/json' });
}

test('エクスポートした内容を読み込むと、全プロジェクトが同じバックログになる', async () => {
  let backlog = backlogReducer(emptyBacklog(), { type: 'createProject', name: 'Tool' });
  backlog = backlogReducer(backlog, { type: 'create', projectId: 1, title: 'a', now });
  backlog = backlogReducer(backlog, { type: 'create', projectId: 2, title: 'b', now });
  expect(await readBacklogFile(file(serializeBacklog(backlog)))).toEqual({ ok: true, backlog });
});

test('エクスポートして読み直してもカテゴリが保たれる', async () => {
  const backlog = singleProject([pbi(1, { category: 'bug' }), pbi(2, { category: 'security' })]);
  const result = await readBacklogFile(file(serializeBacklog(backlog)));
  expect(result.ok && result.backlog.projects[0].items.map((p) => p.category)).toEqual(['bug', 'security']);
});

test('インポート後の採番は、プロジェクトごとにファイルの nextNumber から続く', async () => {
  const data = {
    version: 3,
    nextProjectId: 3,
    projects: [
      { id: 1, name: 'Web', nextNumber: 3, items: [pbi(1)] },
      { id: 2, name: 'Tool', nextNumber: 3, items: [pbi(1), pbi(2)] },
    ],
  };
  const result = await readBacklogFile(file(JSON.stringify(data)));
  if (!result.ok) throw new Error(result.reason);

  const remote = new FakeRemote();
  const { result: store } = renderHook(() => useBacklog(remote));
  await act(async () => {
    await store.current.replace(result.backlog);
  });
  act(() => store.current.dispatch({ type: 'create', projectId: 1, title: 'web', now }));
  act(() => store.current.dispatch({ type: 'create', projectId: 2, title: 'tool', now }));
  const [web, tool] = store.current.backlog.projects;
  expect(web.items.map((p) => formatPbiId(p.number))).toEqual(['PBI-1', 'PBI-3']);
  expect(tool.items.map((p) => formatPbiId(p.number))).toEqual(['PBI-1', 'PBI-2', 'PBI-3']);
});

test('通し番号の旧形式（version 2）のファイルは、2つ目以降のプロジェクトを振り直して読み込む', async () => {
  const at = (n: number) => `2026-10-01T00:${String(n).padStart(2, '0')}:00.000Z`;
  const data = {
    version: 2,
    nextNumber: 13,
    nextProjectId: 3,
    projects: [
      {
        id: 1,
        name: 'Jisaku-Jira-App',
        items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 11].map((n) => pbi(n, { createdAt: at(n) })),
      },
      { id: 2, name: 'Yarikuri', items: [pbi(10, { createdAt: at(10) }), pbi(12, { createdAt: at(12) })] },
    ],
  };
  const result = await readBacklogFile(file(JSON.stringify(data)));
  if (!result.ok) throw new Error(result.reason);
  let backlog = backlogReducer(result.backlog, { type: 'create', projectId: 1, title: 'app', now });
  backlog = backlogReducer(backlog, { type: 'create', projectId: 2, title: 'yarikuri', now });
  const [app, yarikuri] = backlog.projects;
  expect(app.items.map((p) => p.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 13]);
  expect(yarikuri.items.map((p) => p.number)).toEqual([1, 2, 3]);
});

test('旧形式（version 1）のファイルは「マイプロジェクト」1つとして読み込む', async () => {
  const data = { version: 1, nextNumber: 6, items: [pbi(1), pbi(5)] };
  const result = await readBacklogFile(file(JSON.stringify(data)));
  expect(result.ok && result.backlog.projects).toEqual([
    { id: 1, name: 'マイプロジェクト', nextNumber: 6, items: [pbi(1), pbi(5)] },
  ]);
});

test('不正なファイルは理由を返し、現在のデータは変わらない', async () => {
  const remote = new FakeRemote();
  const { result: store } = renderHook(() => useBacklog(remote));
  act(() => store.current.dispatch({ type: 'create', projectId: 1, title: 'keep', now }));
  const before = store.current.backlog;

  const result = await readBacklogFile(file('not json'));
  expect(result).toEqual({ ok: false, reason: 'JSON として読み込めません' });
  expect(store.current.backlog).toBe(before);
});

test('ファイル名に日付が入る', () => {
  expect(exportFileName(new Date(2026, 9, 2))).toBe('jisaku-jira-backlog-20261002.json');
});
