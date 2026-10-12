import { pbi } from '../test/backlog';
import { emptyBacklog } from './model';
import { backlogReducer } from './reducer';
import {
  ACTIVE_PROJECT_KEY,
  STORAGE_KEY,
  loadActiveProject,
  loadBacklog,
  saveActiveProject,
  saveBacklog,
} from './storage';

const now = '2026-10-12T00:00:00.000Z';

const failing = {
  getItem: () => {
    throw new DOMException('denied', 'SecurityError');
  },
  setItem: () => {
    throw new DOMException('quota', 'QuotaExceededError');
  },
} as unknown as Storage;

test('保存データがなければ empty', () => {
  expect(loadBacklog(localStorage)).toEqual({ kind: 'empty' });
});

test('保存→読み込みでプロジェクト・内容・順序・nextNumber が一致する', () => {
  let backlog = backlogReducer(emptyBacklog(), { type: 'createProject', name: 'Tool' });
  for (const title of ['a', 'b', 'c']) backlog = backlogReducer(backlog, { type: 'create', projectId: 1, title, now });
  backlog = backlogReducer(backlog, { type: 'create', projectId: 2, title: 'd', now });
  backlog = backlogReducer(backlog, { type: 'delete', number: 3 });
  backlog = backlogReducer(backlog, { type: 'move', number: 2, toIndex: 0 });

  expect(saveBacklog(localStorage, backlog)).toBe(true);
  expect(loadBacklog(localStorage)).toEqual({ kind: 'loaded', backlog });
  expect(backlog.nextNumber).toBe(5);
});

test('旧形式（version 1）の保存データは「マイプロジェクト」1つの version 2 として読み込む', () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, nextNumber: 4, items: [pbi(1), pbi(2)] }));
  expect(loadBacklog(localStorage)).toEqual({
    kind: 'loaded',
    backlog: {
      version: 2,
      nextNumber: 4,
      nextProjectId: 2,
      projects: [{ id: 1, name: 'マイプロジェクト', items: [pbi(1), pbi(2)] }],
    },
  });
});

test('壊れた JSON は error になり、保存データは消さない', () => {
  localStorage.setItem(STORAGE_KEY, '{ broken');
  expect(loadBacklog(localStorage).kind).toBe('error');
  expect(localStorage.getItem(STORAGE_KEY)).toBe('{ broken');
});

test('書き込みが例外になったら false を返す', () => {
  expect(saveBacklog(failing, emptyBacklog())).toBe(false);
});

test('ストレージが使えない環境では保存失敗・読み込みは empty', () => {
  expect(saveBacklog(null, emptyBacklog())).toBe(false);
  expect(loadBacklog(null)).toEqual({ kind: 'empty' });
});

describe('最後に選んだプロジェクト', () => {
  test('保存した id を読み込める', () => {
    saveActiveProject(localStorage, 3);
    expect(loadActiveProject(localStorage)).toBe(3);
  });

  test('保存していなければ null', () => {
    expect(loadActiveProject(localStorage)).toBeNull();
  });

  test.each(['abc', '0', '-1', '1.5', ''])('読めない値 (%j) は null', (value) => {
    localStorage.setItem(ACTIVE_PROJECT_KEY, value);
    expect(loadActiveProject(localStorage)).toBeNull();
  });

  test('ストレージが例外を投げる、または使えない環境では null で、書き込みの失敗は無視する', () => {
    expect(loadActiveProject(failing)).toBeNull();
    expect(() => saveActiveProject(failing, 1)).not.toThrow();
    expect(loadActiveProject(null)).toBeNull();
    expect(() => saveActiveProject(null, 1)).not.toThrow();
  });
});
