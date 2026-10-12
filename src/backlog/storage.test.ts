import { emptyBacklog } from './model';
import { backlogReducer } from './reducer';
import { STORAGE_KEY, loadBacklog, saveBacklog } from './storage';

const now = '2026-10-12T00:00:00.000Z';

test('保存データがなければ empty', () => {
  expect(loadBacklog(localStorage)).toEqual({ kind: 'empty' });
});

test('保存→読み込みで内容・順序・nextNumber が一致する', () => {
  let backlog = emptyBacklog();
  for (const title of ['a', 'b', 'c']) backlog = backlogReducer(backlog, { type: 'create', title, now });
  backlog = backlogReducer(backlog, { type: 'delete', number: 3 });
  backlog = backlogReducer(backlog, { type: 'move', number: 2, toIndex: 0 });

  expect(saveBacklog(localStorage, backlog)).toBe(true);
  expect(loadBacklog(localStorage)).toEqual({ kind: 'loaded', backlog });
  expect(backlog.nextNumber).toBe(4);
});

test('壊れた JSON は error になり、保存データは消さない', () => {
  localStorage.setItem(STORAGE_KEY, '{ broken');
  expect(loadBacklog(localStorage).kind).toBe('error');
  expect(localStorage.getItem(STORAGE_KEY)).toBe('{ broken');
});

test('書き込みが例外になったら false を返す', () => {
  const failing = {
    getItem: () => null,
    setItem: () => {
      throw new DOMException('quota', 'QuotaExceededError');
    },
  } as unknown as Storage;
  expect(saveBacklog(failing, emptyBacklog())).toBe(false);
});

test('ストレージが使えない環境では保存失敗・読み込みは empty', () => {
  expect(saveBacklog(null, emptyBacklog())).toBe(false);
  expect(loadBacklog(null)).toEqual({ kind: 'empty' });
});
