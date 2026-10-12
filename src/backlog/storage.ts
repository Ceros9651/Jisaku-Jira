import type { Backlog } from './model';
import { parseBacklogJson } from './validate';

export const STORAGE_KEY = 'jisaku-jira:backlog';

export type LoadResult =
  | { kind: 'empty' }
  | { kind: 'loaded'; backlog: Backlog }
  | { kind: 'error'; reason: string };

/** localStorage の取得自体が例外になる環境（ストレージ無効など）でも null を返す */
export function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadBacklog(storage: Storage | null): LoadResult {
  if (storage === null) return { kind: 'empty' };
  let text: string | null;
  try {
    text = storage.getItem(STORAGE_KEY);
  } catch {
    return { kind: 'empty' };
  }
  if (text === null) return { kind: 'empty' };
  const result = parseBacklogJson(text);
  return result.ok ? { kind: 'loaded', backlog: result.backlog } : { kind: 'error', reason: result.reason };
}

/** 保存できたら true。ストレージが使えない、容量超過などで失敗したら false */
export function saveBacklog(storage: Storage | null, backlog: Backlog): boolean {
  if (storage === null) return false;
  try {
    storage.setItem(STORAGE_KEY, serializeBacklog(backlog));
    return true;
  } catch {
    return false;
  }
}

export function serializeBacklog(backlog: Backlog): string {
  return JSON.stringify(backlog, null, 2);
}
