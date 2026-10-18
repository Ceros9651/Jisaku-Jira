import { act, renderHook } from '@testing-library/react';
import { backlogOf, pbi } from '../test/backlog';
import { FakeRemote } from '../test/remote';
import { emptyBacklog } from './model';
import { useBacklog } from './useBacklog';

const now = '2026-10-12T00:00:00.000Z';

const titles = (remote: FakeRemote) => remote.backlog()?.projects[0].items.map((p) => p.title);

test('最初の受信までは loading で、共有データが無ければ空のバックログで ready になる', () => {
  const remote = new FakeRemote();
  remote.hold();
  const { result } = renderHook(() => useBacklog(remote));
  expect(result.current.status).toBe('loading');

  act(() => remote.flush());
  expect(result.current.status).toBe('ready');
  expect(result.current.backlog).toEqual(emptyBacklog());
});

test('共有データの内容を表示する', () => {
  const remote = new FakeRemote(backlogOf(['Web', [pbi(1)]], ['Tool', [pbi(2)]]));
  const { result } = renderHook(() => useBacklog(remote));
  expect(result.current.backlog.projects.map((p) => p.name)).toEqual(['Web', 'Tool']);
});

test('操作は保存の完了を待たずに表示し、完了後も1件のまま', () => {
  const remote = new FakeRemote();
  const { result } = renderHook(() => useBacklog(remote));
  remote.hold();
  act(() => result.current.dispatch({ type: 'create', projectId: 1, title: 'a', now }));
  expect(result.current.backlog.projects[0].items.map((p) => p.title)).toEqual(['a']);
  expect(remote.text).toBeNull();

  act(() => remote.flush());
  expect(titles(remote)).toEqual(['a']);
  expect(result.current.backlog.projects[0].items.map((p) => p.title)).toEqual(['a']);
});

test('保存の完了が受信より後に届いても二重に表示しない', async () => {
  const remote = new FakeRemote();
  const { result } = renderHook(() => useBacklog(remote));
  await act(async () => {
    result.current.dispatch({ type: 'create', projectId: 1, title: 'a', now });
  });
  expect(result.current.backlog.projects[0].items).toHaveLength(1);
  expect(result.current.backlog.projects[0].nextNumber).toBe(2);
});

test('保存に失敗すると表示が共有データに戻り、saveFailed が立つ', async () => {
  const remote = new FakeRemote(backlogOf(['マイプロジェクト', [pbi(1)]]));
  const { result } = renderHook(() => useBacklog(remote));
  remote.failNext();
  await act(async () => {
    result.current.dispatch({ type: 'update', projectId: 1, number: 1, changes: { status: 'done' }, now });
  });
  expect(result.current.backlog.projects[0].items[0].status).toBe('todo');
  expect(result.current.saveFailed).toBe(true);

  act(() => result.current.dismissSaveFailed());
  expect(result.current.saveFailed).toBe(false);
});

test('他の端末の変更が反映される', () => {
  const remote = new FakeRemote();
  const { result } = renderHook(() => useBacklog(remote));
  act(() => remote.push(backlogOf(['マイプロジェクト', [pbi(1, { title: 'ログイン画面' })]])));
  expect(result.current.backlog.projects[0].items.map((p) => p.title)).toEqual(['ログイン画面']);
});

test('保存中に他の端末の変更が届いても、未確定の自分の操作は重ねて表示し続ける', () => {
  const remote = new FakeRemote(backlogOf(['マイプロジェクト', [pbi(1), pbi(2)]]));
  const { result } = renderHook(() => useBacklog(remote));
  remote.hold();
  act(() => result.current.dispatch({ type: 'update', projectId: 1, number: 1, changes: { title: '自分' }, now }));
  act(() => remote.push(backlogOf(['マイプロジェクト', [pbi(1), pbi(2, { title: '他の人' })]])));
  expect(result.current.backlog.projects[0].items.map((p) => p.title)).toEqual(['自分', '他の人']);

  act(() => remote.flush());
  expect(titles(remote)).toEqual(['自分', '他の人']);
  expect(result.current.backlog.projects[0].items.map((p) => p.title)).toEqual(['自分', '他の人']);
});

test('2つの端末から同時に作成しても番号が重複しない', () => {
  const remote = new FakeRemote();
  const a = renderHook(() => useBacklog(remote));
  const b = renderHook(() => useBacklog(remote));
  remote.hold();
  act(() => a.result.current.dispatch({ type: 'create', projectId: 1, title: 'A', now }));
  act(() => b.result.current.dispatch({ type: 'create', projectId: 1, title: 'B', now }));
  // どちらも保存前は自分の画面で PBI-1 に見える
  expect(a.result.current.backlog.projects[0].items[0].number).toBe(1);
  expect(b.result.current.backlog.projects[0].items[0].number).toBe(1);

  act(() => remote.flush());
  const expected = [
    { number: 1, title: 'A' },
    { number: 2, title: 'B' },
  ];
  for (const hook of [a, b]) {
    expect(hook.result.current.backlog.projects[0].items.map(({ number, title }) => ({ number, title }))).toEqual(expected);
  }
});

test('別々の PBI の同時の編集は両方残る', () => {
  const remote = new FakeRemote(backlogOf(['マイプロジェクト', [pbi(1), pbi(2)]]));
  const a = renderHook(() => useBacklog(remote));
  const b = renderHook(() => useBacklog(remote));
  remote.hold();
  act(() => a.result.current.dispatch({ type: 'update', projectId: 1, number: 1, changes: { title: '新しいタイトル' }, now }));
  act(() => b.result.current.dispatch({ type: 'update', projectId: 1, number: 2, changes: { status: 'done' }, now }));
  act(() => remote.flush());

  for (const hook of [a, b]) {
    const [first, second] = hook.result.current.backlog.projects[0].items;
    expect(first.title).toBe('新しいタイトル');
    expect(second.status).toBe('done');
  }
});

test('別々のプロジェクトの同じ番号の PBI を同時に編集すると、両方の変更が残る', () => {
  const remote = new FakeRemote(backlogOf(['Web', [pbi(1)]], ['Tool', [pbi(1)]]));
  const a = renderHook(() => useBacklog(remote));
  const b = renderHook(() => useBacklog(remote));
  remote.hold();
  act(() => a.result.current.dispatch({ type: 'update', projectId: 1, number: 1, changes: { title: 'Web の新しいタイトル' }, now }));
  act(() => b.result.current.dispatch({ type: 'update', projectId: 2, number: 1, changes: { status: 'done' }, now }));
  act(() => remote.flush());

  for (const hook of [a, b]) {
    const [web, tool] = hook.result.current.backlog.projects;
    expect(web.items[0]).toMatchObject({ title: 'Web の新しいタイトル', status: 'todo' });
    expect(tool.items[0]).toMatchObject({ title: 'PBI 1', status: 'done' });
  }
});

test('読めない共有データでは loadError になり、操作しても書き込まない。空で始めると上書きする', async () => {
  const remote = new FakeRemote('{ broken');
  const { result } = renderHook(() => useBacklog(remote));
  expect(result.current.status).toBe('ready');
  expect(result.current.loadError).not.toBeNull();

  act(() => result.current.dispatch({ type: 'create', projectId: 1, title: 'a', now }));
  expect(remote.applyCount).toBe(0);
  expect(remote.text).toBe('{ broken');

  await act(async () => {
    await expect(result.current.startEmpty()).resolves.toBe(true);
  });
  expect(result.current.loadError).toBeNull();
  expect(remote.backlog()).toEqual(emptyBacklog());
});

test('replace は保存できたら true、失敗したら false', async () => {
  const remote = new FakeRemote();
  const { result } = renderHook(() => useBacklog(remote));
  const imported = backlogOf(['Web', [pbi(5)]]);
  await act(async () => {
    await expect(result.current.replace(imported)).resolves.toBe(true);
  });
  expect(remote.backlog()).toEqual(imported);

  remote.failNext();
  await act(async () => {
    await expect(result.current.replace(emptyBacklog())).resolves.toBe(false);
  });
  expect(remote.backlog()).toEqual(imported);
  expect(result.current.backlog).toEqual(imported);
});

test('購読できなければ error になり、理由を返す', () => {
  const remote = new FakeRemote();
  remote.failSubscribe('permission-denied');
  const { result } = renderHook(() => useBacklog(remote));
  expect(result.current.status).toBe('error');
  expect(result.current.connectionError).toBe('permission-denied');
});
