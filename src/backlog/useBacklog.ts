import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type Backlog, emptyBacklog } from './model';
import { type BacklogAction, backlogReducer } from './reducer';
import type { BacklogRemote, RemoteSnapshot } from './remote';
import { parseBacklogJson } from './validate';

export type BacklogStatus = 'loading' | 'ready' | 'error';

export type BacklogStore = {
  /** 共有データに、まだ反映を確認していない自分の操作を重ねたもの */
  backlog: Backlog;
  dispatch: (action: BacklogAction) => void;
  /** 最初の受信までは loading、購読できなければ error */
  status: BacklogStatus;
  /** 購読できなかった理由 */
  connectionError: string | null;
  /** 共有データを読めなかった理由。解消するまで replace 以外の操作はしない */
  loadError: string | null;
  /** 直近の保存に失敗したか */
  saveFailed: boolean;
  dismissSaveFailed: () => void;
  /** 共有データを空のバックログで上書きする（読めない共有データからの復帰） */
  startEmpty: () => Promise<boolean>;
  /** 共有データ全体を置き換える（インポート）。保存できたら true */
  replace: (backlog: Backlog) => Promise<boolean>;
};

type Pending = { id: string; action: BacklogAction };

// 操作の id。端末をまたいで重ならないよう、開くたびに乱数の接頭辞を付ける
const session = Math.random().toString(36).slice(2, 10);
let opCounter = 0;
const nextOpId = () => `${session}-${++opCounter}`;

export function useBacklog(remote: BacklogRemote): BacklogStore {
  const [status, setStatus] = useState<BacklogStatus>('loading');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [server, setServer] = useState<Backlog>(emptyBacklog);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [saveFailed, setSaveFailed] = useState(false);
  // 直近の受信で反映済みだった操作の id。保存の完了が受信より後に届いたときに見る
  const appliedOps = useRef<ReadonlySet<string>>(new Set());

  const drop = useCallback((ids: (id: string) => boolean) => {
    setPending((list) => (list.some((p) => ids(p.id)) ? list.filter((p) => !ids(p.id)) : list));
  }, []);

  useEffect(() => {
    const onData = (snapshot: RemoteSnapshot) => {
      setStatus('ready');
      setConnectionError(null);
      if (snapshot.kind === 'missing') {
        appliedOps.current = new Set();
        setServer(emptyBacklog());
        setLoadError(null);
        return;
      }
      const ops = new Set(snapshot.ops);
      appliedOps.current = ops;
      // 反映された自分の操作は重ねるのをやめる（二重に適用しない）
      drop((id) => ops.has(id));
      const result = parseBacklogJson(snapshot.text);
      if (result.ok) {
        setServer(result.backlog);
        setLoadError(null);
      } else {
        setLoadError(result.reason);
      }
    };
    const onError = (message: string) => {
      setStatus('error');
      setConnectionError(message);
    };
    return remote.subscribe(onData, onError);
  }, [remote, drop]);

  const send = useCallback(
    (action: BacklogAction): Promise<boolean> => {
      const id = nextOpId();
      setPending((list) => [...list, { id, action }]);
      return remote.apply(action, id).then(
        (written) => {
          // 書き込まなかった、または完了より先に反映を受信していたら、ここで外す。それ以外は受信を待つ
          if (!written || appliedOps.current.has(id)) drop((p) => p === id);
          return true;
        },
        () => {
          drop((p) => p === id);
          setSaveFailed(true);
          return false;
        },
      );
    },
    [remote, drop],
  );

  const dispatch = useCallback(
    (action: BacklogAction) => {
      if (loadError !== null) return;
      void send(action);
    },
    [send, loadError],
  );

  const replace = useCallback((next: Backlog) => send({ type: 'replace', backlog: next }), [send]);
  const startEmpty = useCallback(() => replace(emptyBacklog()), [replace]);
  const dismissSaveFailed = useCallback(() => setSaveFailed(false), []);

  const backlog = useMemo(() => pending.reduce((state, p) => backlogReducer(state, p.action), server), [pending, server]);

  return { backlog, dispatch, status, connectionError, loadError, saveFailed, dismissSaveFailed, startEmpty, replace };
}
