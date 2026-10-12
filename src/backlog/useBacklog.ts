import { useCallback, useEffect, useReducer, useState } from 'react';
import { type Backlog, emptyBacklog } from './model';
import { type BacklogAction, backlogReducer } from './reducer';
import { getStorage, loadBacklog, saveBacklog } from './storage';

export type BacklogStore = {
  backlog: Backlog;
  dispatch: (action: BacklogAction) => void;
  /** 起動時に保存データを読めなかった理由。解消するまで保存しない */
  loadError: string | null;
  /** 直近の保存に失敗したか */
  saveFailed: boolean;
  /** 読み込みエラーを無視して空のバックログで始める（次の保存で元データを上書きする） */
  startEmpty: () => void;
  /** バックログ全体を置き換える（インポート） */
  replace: (backlog: Backlog) => void;
};

type Init = { backlog: Backlog; loadError: string | null };

export function useBacklog(storage: Storage | null = getStorage()): BacklogStore {
  const [init] = useState<Init>(() => {
    const result = loadBacklog(storage);
    if (result.kind === 'loaded') return { backlog: result.backlog, loadError: null };
    if (result.kind === 'error') return { backlog: emptyBacklog(), loadError: result.reason };
    return { backlog: emptyBacklog(), loadError: null };
  });
  const [backlog, dispatch] = useReducer(backlogReducer, init.backlog);
  const [loadError, setLoadError] = useState(init.loadError);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    if (loadError !== null) return;
    setSaveFailed(!saveBacklog(storage, backlog));
  }, [storage, backlog, loadError]);

  const startEmpty = useCallback(() => {
    dispatch({ type: 'replace', backlog: emptyBacklog() });
    setLoadError(null);
  }, []);

  const replace = useCallback((next: Backlog) => {
    dispatch({ type: 'replace', backlog: next });
    setLoadError(null);
  }, []);

  return { backlog, dispatch, loadError, saveFailed, startEmpty, replace };
}
