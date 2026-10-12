import type { Backlog } from '../backlog/model';
import type { BacklogAction } from '../backlog/reducer';
import { type BacklogRemote, type RemoteSnapshot, appendOp, nextBacklog } from '../backlog/remote';
import { serializeBacklog } from '../backlog/storage';
import { parseBacklogJson } from '../backlog/validate';

type Listener = { onData: (s: RemoteSnapshot) => void; onError: (message: string) => void; started: boolean };

/**
 * テスト用の共有データ。メモリ上の JSON 文字列を持ち、apply で最新の内容に reducer を適用して全購読者へ配る。
 * 配信は同期で行う（React の更新は呼び出し側で act に包む）。
 */
export class FakeRemote implements BacklogRemote {
  /** null は一度も保存されていない状態 */
  text: string | null;
  ops: string[] = [];
  /** 成功・失敗を問わず apply が呼ばれた回数 */
  applyCount = 0;
  private listeners = new Set<Listener>();
  private held = false;
  private waiting: (() => void)[] = [];
  private failures = 0;
  private subscribeError: string | null = null;
  private pushes = 0;

  constructor(initial: Backlog | string | null = null) {
    this.text = typeof initial === 'object' && initial !== null ? serializeBacklog(initial) : initial;
  }

  subscribe(onData: (s: RemoteSnapshot) => void, onError: (message: string) => void): () => void {
    const listener: Listener = { onData, onError, started: false };
    this.listeners.add(listener);
    const start = () => {
      if (!this.listeners.has(listener) || listener.started) return;
      listener.started = true;
      if (this.subscribeError !== null) onError(this.subscribeError);
      else onData(this.snapshot());
    };
    if (this.held) this.waiting.push(start);
    else start();
    return () => {
      this.listeners.delete(listener);
    };
  }

  apply(action: BacklogAction, opId: string): Promise<boolean> {
    this.applyCount += 1;
    return new Promise((resolve, reject) => {
      const commit = () => {
        if (this.failures > 0) {
          this.failures -= 1;
          reject(new Error('保存できませんでした'));
          return;
        }
        let next: Backlog | null;
        try {
          next = nextBacklog(this.text, action);
        } catch (error) {
          reject(error);
          return;
        }
        if (next !== null) this.write(serializeBacklog(next), appendOp(this.ops, opId));
        resolve(next !== null);
      };
      if (this.held) this.waiting.push(commit);
      else commit();
    });
  }

  /** 他の端末が書き込んだことにする。hold 中でもすぐ配る */
  push(data: Backlog | string): void {
    this.pushes += 1;
    this.write(typeof data === 'string' ? data : serializeBacklog(data), appendOp(this.ops, `other-${this.pushes}`));
  }

  /** 次の n 回の apply を失敗させる */
  failNext(n = 1): void {
    this.failures += n;
  }

  /** 以後の subscribe をエラーにする */
  failSubscribe(message: string): void {
    this.subscribeError = message;
  }

  /** flush まで、apply の確定と subscribe の最初の配信を止める */
  hold(): void {
    this.held = true;
  }

  /** 止めていた処理を順に進める */
  flush(): void {
    this.held = false;
    const waiting = this.waiting;
    this.waiting = [];
    for (const run of waiting) run();
  }

  /** 現在の内容。テストの検証用 */
  backlog(): Backlog | null {
    if (this.text === null) return null;
    const result = parseBacklogJson(this.text);
    return result.ok ? result.backlog : null;
  }

  private snapshot(): RemoteSnapshot {
    return this.text === null ? { kind: 'missing' } : { kind: 'text', text: this.text, ops: this.ops };
  }

  private write(text: string, ops: string[]): void {
    this.text = text;
    this.ops = ops;
    for (const listener of this.listeners) if (listener.started) listener.onData(this.snapshot());
  }
}
