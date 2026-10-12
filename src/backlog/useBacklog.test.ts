import { act, renderHook } from '@testing-library/react';
import { emptyBacklog } from './model';
import { STORAGE_KEY, loadBacklog } from './storage';
import { useBacklog } from './useBacklog';

const now = '2026-10-12T00:00:00.000Z';

test('操作のたびに保存し、開き直すと同じ内容になる', () => {
  const first = renderHook(() => useBacklog(localStorage));
  act(() => first.result.current.dispatch({ type: 'create', projectId: 1, title: 'a', now }));
  act(() => first.result.current.dispatch({ type: 'create', projectId: 1, title: 'b', now }));
  act(() => first.result.current.dispatch({ type: 'createProject', name: 'Tool' }));
  first.unmount();

  const second = renderHook(() => useBacklog(localStorage));
  const [mine, tool] = second.result.current.backlog.projects;
  expect(mine.items.map((p) => p.title)).toEqual(['a', 'b']);
  expect(tool.name).toBe('Tool');
});

test('再読み込み後も採番が続く', () => {
  const first = renderHook(() => useBacklog(localStorage));
  for (const title of ['a', 'b', 'c']) {
    act(() => first.result.current.dispatch({ type: 'create', projectId: 1, title, now }));
  }
  act(() => first.result.current.dispatch({ type: 'delete', number: 3 }));
  first.unmount();

  const second = renderHook(() => useBacklog(localStorage));
  act(() => second.result.current.dispatch({ type: 'create', projectId: 1, title: 'd', now }));
  expect(second.result.current.backlog.projects[0].items.map((p) => p.number)).toEqual([1, 2, 4]);
});

test('旧形式の保存データは、起動直後の保存で version 2 に書き直す', () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, nextNumber: 1, items: [] }));
  renderHook(() => useBacklog(localStorage));
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '')).toEqual(emptyBacklog());
});

test('読み込みエラーの間は保存せず、空で始めると保存を再開する', () => {
  localStorage.setItem(STORAGE_KEY, '{ broken');
  const { result } = renderHook(() => useBacklog(localStorage));
  expect(result.current.loadError).not.toBeNull();

  act(() => result.current.dispatch({ type: 'create', projectId: 1, title: 'a', now }));
  expect(localStorage.getItem(STORAGE_KEY)).toBe('{ broken');

  act(() => result.current.startEmpty());
  expect(result.current.loadError).toBeNull();
  expect(loadBacklog(localStorage)).toEqual({ kind: 'loaded', backlog: emptyBacklog() });
});

test('保存に失敗すると saveFailed になる', () => {
  const failing = {
    getItem: () => null,
    setItem: () => {
      throw new Error('quota');
    },
  } as unknown as Storage;
  const { result } = renderHook(() => useBacklog(failing));
  expect(result.current.saveFailed).toBe(true);
  // 画面上の内容は残る
  act(() => result.current.dispatch({ type: 'create', projectId: 1, title: 'a', now }));
  expect(result.current.backlog.projects[0].items).toHaveLength(1);
});
