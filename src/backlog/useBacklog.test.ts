import { act, renderHook } from '@testing-library/react';
import { STORAGE_KEY, loadBacklog } from './storage';
import { useBacklog } from './useBacklog';

const now = '2026-10-12T00:00:00.000Z';

test('操作のたびに保存し、開き直すと同じ内容になる', () => {
  const first = renderHook(() => useBacklog(localStorage));
  act(() => first.result.current.dispatch({ type: 'create', title: 'a', now }));
  act(() => first.result.current.dispatch({ type: 'create', title: 'b', now }));
  first.unmount();

  const second = renderHook(() => useBacklog(localStorage));
  expect(second.result.current.backlog.items.map((p) => p.title)).toEqual(['a', 'b']);
});

test('再読み込み後も採番が続く', () => {
  const first = renderHook(() => useBacklog(localStorage));
  for (const title of ['a', 'b', 'c']) act(() => first.result.current.dispatch({ type: 'create', title, now }));
  act(() => first.result.current.dispatch({ type: 'delete', number: 3 }));
  first.unmount();

  const second = renderHook(() => useBacklog(localStorage));
  act(() => second.result.current.dispatch({ type: 'create', title: 'd', now }));
  expect(second.result.current.backlog.items.map((p) => p.number)).toEqual([1, 2, 4]);
});

test('読み込みエラーの間は保存せず、空で始めると保存を再開する', () => {
  localStorage.setItem(STORAGE_KEY, '{ broken');
  const { result } = renderHook(() => useBacklog(localStorage));
  expect(result.current.loadError).not.toBeNull();

  act(() => result.current.dispatch({ type: 'create', title: 'a', now }));
  expect(localStorage.getItem(STORAGE_KEY)).toBe('{ broken');

  act(() => result.current.startEmpty());
  expect(result.current.loadError).toBeNull();
  expect(loadBacklog(localStorage)).toEqual({ kind: 'loaded', backlog: { version: 1, nextNumber: 1, items: [] } });
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
  act(() => result.current.dispatch({ type: 'create', title: 'a', now }));
  expect(result.current.backlog.items).toHaveLength(1);
});
