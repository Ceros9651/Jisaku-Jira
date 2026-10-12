import { type Backlog, emptyBacklog } from './model';
import { type BacklogAction, backlogReducer } from './reducer';
import { parseBacklogJson } from './validate';

/**
 * 共有データの中身。まだ一度も保存されていなければ missing。検証は受け取った側で行う。
 * ops は直近に反映された操作の id（古い順、最大 MAX_OPS 件）。自分の操作が反映済みかを見分けるのに使う。
 */
export type RemoteSnapshot = { kind: 'missing' } | { kind: 'text'; text: string; ops: string[] };

/**
 * すべての端末で共有するバックログの窓口。実装は firebase.ts（Firestore）と、テスト用の src/test/remote.ts。
 * 自分の書き込みも subscribe の onData で届く。
 */
export interface BacklogRemote {
  /** 最新の内容と、以後の変更を受け取る。接続できなければ onError。戻り値で購読をやめる */
  subscribe(onData: (snapshot: RemoteSnapshot) => void, onError: (message: string) => void): () => void;
  /**
   * 共有データの最新の内容に action を適用し、opId を ops に足して保存する。
   * 内容が変わらず書き込まなかったときは false。読めない内容の上には書かず reject する。
   */
  apply(action: BacklogAction, opId: string): Promise<boolean>;
}

export const MAX_OPS = 50;

/**
 * 共有データの最新の内容（無ければ null）に action を適用した結果。変わらなければ null。
 * 読めない内容には replace（インポート・空で始める）以外を適用せず、例外にする。
 */
export function nextBacklog(currentText: string | null, action: BacklogAction): Backlog | null {
  if (action.type === 'replace') return action.backlog;
  const current = currentText === null ? { ok: true as const, backlog: emptyBacklog() } : parseBacklogJson(currentText);
  if (!current.ok) throw new Error(`共有データを読み込めません: ${current.reason}`);
  const next = backlogReducer(current.backlog, action);
  return next === current.backlog ? null : next;
}

export function appendOp(ops: readonly string[], opId: string): string[] {
  return [...ops, opId].slice(-MAX_OPS);
}
