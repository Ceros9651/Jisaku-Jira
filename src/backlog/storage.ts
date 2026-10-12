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

/** 最後に選んだプロジェクトの id。タブの切り替えでデータが変わらないよう、バックログとは別に保存する */
export const ACTIVE_PROJECT_KEY = 'jisaku-jira:active-project';

/** 記憶したプロジェクトの id。無い、読めない、ストレージが使えないときは null */
export function loadActiveProject(storage: Storage | null): number | null {
  if (storage === null) return null;
  try {
    const value = Number(storage.getItem(ACTIVE_PROJECT_KEY));
    return Number.isInteger(value) && value >= 1 ? value : null;
  } catch {
    return null;
  }
}

/** 書き込みの失敗は無視する（記憶できないだけで、次は最初のプロジェクトを表示する） */
export function saveActiveProject(storage: Storage | null, id: number): void {
  try {
    storage?.setItem(ACTIVE_PROJECT_KEY, String(id));
  } catch {
    // 無視する
  }
}

export function serializeBacklog(backlog: Backlog): string {
  return JSON.stringify(backlog, null, 2);
}
