import { pbi } from '../test/backlog';
import { FakeRemote } from '../test/remote';
import { type Backlog, type Pbi, emptyBacklog } from './model';
import { MAX_OPS, type RemoteSnapshot, appendOp } from './remote';

const now = '2026-10-12T00:00:00.000Z';

function withoutCategory(p: Pbi): Omit<Pbi, 'category'> {
  const { category: _, ...rest } = p;
  return rest;
}

test('片方の apply がもう片方の購読者に届く', async () => {
  const remote = new FakeRemote();
  const a: RemoteSnapshot[] = [];
  const b: RemoteSnapshot[] = [];
  remote.subscribe((s) => a.push(s), () => {});
  remote.subscribe((s) => b.push(s), () => {});
  expect(b).toEqual([{ kind: 'missing' }]);

  await expect(remote.apply({ type: 'create', projectId: 1, title: 'ログイン画面', now }, 'op-1')).resolves.toBe(true);

  expect(b).toHaveLength(2);
  expect(a).toEqual(b);
  expect(b[1]).toMatchObject({ kind: 'text', ops: ['op-1'] });
  expect(remote.backlog()?.projects[0].items.map((p) => p.title)).toEqual(['ログイン画面']);
});

test('内容が変わらない操作は書き込まず false', async () => {
  const remote = new FakeRemote();
  await expect(remote.apply({ type: 'createProject', name: '  ' }, 'op-1')).resolves.toBe(false);
  expect(remote.text).toBeNull();
});

test('読めない JSON の上では apply が reject され、内容は変わらない', async () => {
  const remote = new FakeRemote('{ broken');
  await expect(remote.apply({ type: 'createProject', name: 'Tool' }, 'op-1')).rejects.toThrow();
  expect(remote.text).toBe('{ broken');
});

test('読めない JSON でも replace（空で始める・インポート）は書き込める', async () => {
  const remote = new FakeRemote('{ broken');
  await remote.apply({ type: 'replace', backlog: emptyBacklog() }, 'op-1');
  expect(remote.backlog()).toEqual(emptyBacklog());
});

test('カテゴリの無い共有データへの作成で、既存の PBI はタスク、新しい PBI は指定のカテゴリで書き戻される', async () => {
  const legacy = {
    version: 2,
    nextNumber: 2,
    nextProjectId: 2,
    projects: [{ id: 1, name: 'Web', items: [withoutCategory(pbi(1))] }],
  };
  const remote = new FakeRemote(JSON.stringify(legacy));
  await remote.apply({ type: 'create', projectId: 1, title: 'テストを書く', category: 'test', now }, 'op-1');

  const written = JSON.parse(remote.text ?? '') as Backlog;
  expect(written.projects[0].items.map((p) => [p.number, p.category])).toEqual([
    [1, 'task'],
    [2, 'test'],
  ]);
});

test('ops は直近 MAX_OPS 件だけ残す', () => {
  const ops = Array.from({ length: MAX_OPS }, (_, i) => `op-${i}`);
  expect(appendOp(ops, 'new')).toEqual([...ops.slice(1), 'new']);
});
