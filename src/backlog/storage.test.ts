import { pbi } from '../test/backlog';
import { emptyBacklog } from './model';
import { backlogReducer } from './reducer';
import {
  ACTIVE_PROJECT_KEY,
  LEGACY_STORAGE_KEY,
  loadActiveProject,
  loadLegacyBacklog,
  removeLegacyBacklog,
  saveActiveProject,
  serializeBacklog,
} from './storage';

const now = '2026-10-12T00:00:00.000Z';

const failing = {
  getItem: () => {
    throw new DOMException('denied', 'SecurityError');
  },
  setItem: () => {
    throw new DOMException('quota', 'QuotaExceededError');
  },
  removeItem: () => {
    throw new DOMException('denied', 'SecurityError');
  },
} as unknown as Storage;

test('以前のデータがなければ empty', () => {
  expect(loadLegacyBacklog(localStorage)).toEqual({ kind: 'empty' });
});

test('以前のデータのプロジェクト・内容・順序・nextNumber を読み込む', () => {
  let backlog = backlogReducer(emptyBacklog(), { type: 'createProject', name: 'Tool' });
  for (const title of ['a', 'b', 'c']) backlog = backlogReducer(backlog, { type: 'create', projectId: 1, title, now });
  backlog = backlogReducer(backlog, { type: 'create', projectId: 2, title: 'd', now });
  backlog = backlogReducer(backlog, { type: 'delete', number: 3 });
  backlog = backlogReducer(backlog, { type: 'move', number: 2, toIndex: 0 });
  localStorage.setItem(LEGACY_STORAGE_KEY, serializeBacklog(backlog));

  expect(loadLegacyBacklog(localStorage)).toEqual({ kind: 'loaded', backlog });
  expect(backlog.nextNumber).toBe(5);
});

test('旧形式（version 1）の以前のデータは「マイプロジェクト」1つの version 2 として読み込む', () => {
  localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ version: 1, nextNumber: 4, items: [pbi(1), pbi(2)] }));
  expect(loadLegacyBacklog(localStorage)).toEqual({
    kind: 'loaded',
    backlog: {
      version: 2,
      nextNumber: 4,
      nextProjectId: 2,
      projects: [{ id: 1, name: 'マイプロジェクト', items: [pbi(1), pbi(2)] }],
    },
  });
});

test('壊れた JSON は error になり、以前のデータは消さない', () => {
  localStorage.setItem(LEGACY_STORAGE_KEY, '{ broken');
  expect(loadLegacyBacklog(localStorage).kind).toBe('error');
  expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBe('{ broken');
});

test('removeLegacyBacklog でキーが消え、他のキーは残る', () => {
  localStorage.setItem(LEGACY_STORAGE_KEY, serializeBacklog(emptyBacklog()));
  saveActiveProject(localStorage, 2);
  removeLegacyBacklog(localStorage);
  expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
  expect(loadActiveProject(localStorage)).toBe(2);
});

test('ストレージが使えない環境では読み込みは empty で、削除の失敗は無視する', () => {
  expect(loadLegacyBacklog(null)).toEqual({ kind: 'empty' });
  expect(loadLegacyBacklog(failing)).toEqual({ kind: 'empty' });
  expect(() => removeLegacyBacklog(failing)).not.toThrow();
  expect(() => removeLegacyBacklog(null)).not.toThrow();
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
