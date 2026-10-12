import { act, renderHook } from '@testing-library/react';
import { pbi } from '../test/backlog';
import { emptyBacklog, formatPbiId } from './model';
import { backlogReducer } from './reducer';
import { serializeBacklog } from './storage';
import { exportFileName, readBacklogFile } from './transfer';
import { useBacklog } from './useBacklog';

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

test('インポート後の採番はファイルの nextNumber から続く', async () => {
  const data = {
    version: 2,
    nextNumber: 6,
    nextProjectId: 3,
    projects: [
      { id: 1, name: 'Web', items: [pbi(1)] },
      { id: 2, name: 'Tool', items: [pbi(5)] },
    ],
  };
  const result = await readBacklogFile(file(JSON.stringify(data)));
  if (!result.ok) throw new Error(result.reason);

  const { result: store } = renderHook(() => useBacklog(localStorage));
  act(() => store.current.replace(result.backlog));
  act(() => store.current.dispatch({ type: 'create', projectId: 1, title: 'new', now }));
  const [web, tool] = store.current.backlog.projects;
  expect(web.items.map((p) => formatPbiId(p.number))).toEqual(['PBI-1', 'PBI-6']);
  expect(tool.items.map((p) => formatPbiId(p.number))).toEqual(['PBI-5']);
});

test('旧形式（version 1）のファイルは「マイプロジェクト」1つとして読み込む', async () => {
  const data = { version: 1, nextNumber: 6, items: [pbi(1), pbi(5)] };
  const result = await readBacklogFile(file(JSON.stringify(data)));
  expect(result.ok && result.backlog.projects).toEqual([{ id: 1, name: 'マイプロジェクト', items: [pbi(1), pbi(5)] }]);
  expect(result.ok && result.backlog.nextNumber).toBe(6);
});

test('不正なファイルは理由を返し、現在のデータは変わらない', async () => {
  const { result: store } = renderHook(() => useBacklog(localStorage));
  act(() => store.current.dispatch({ type: 'create', projectId: 1, title: 'keep', now }));
  const before = store.current.backlog;

  const result = await readBacklogFile(file('not json'));
  expect(result).toEqual({ ok: false, reason: 'JSON として読み込めません' });
  expect(store.current.backlog).toBe(before);
});

test('ファイル名に日付が入る', () => {
  expect(exportFileName(new Date(2026, 9, 2))).toBe('jisaku-jira-backlog-20261002.json');
});
