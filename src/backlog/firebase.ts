import { initializeApp } from 'firebase/app';
import { doc, getFirestore, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { type BacklogRemote, appendOp, nextBacklog } from './remote';
import { serializeBacklog } from './storage';

export type FirebaseConfig = { apiKey: string; authDomain: string; projectId: string; appId: string };

type Env = Partial<
  Record<'VITE_FIREBASE_API_KEY' | 'VITE_FIREBASE_AUTH_DOMAIN' | 'VITE_FIREBASE_PROJECT_ID' | 'VITE_FIREBASE_APP_ID', string>
>;

/** ビルド時の環境変数から接続設定を作る。1つでも欠けていれば null */
export function firebaseConfigFromEnv(env: Env): FirebaseConfig | null {
  const config = {
    apiKey: env.VITE_FIREBASE_API_KEY?.trim() ?? '',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN?.trim() ?? '',
    projectId: env.VITE_FIREBASE_PROJECT_ID?.trim() ?? '',
    appId: env.VITE_FIREBASE_APP_ID?.trim() ?? '',
  };
  return Object.values(config).every((v) => v !== '') ? config : null;
}

export const UNCONFIGURED_MESSAGE = '共有データの接続先が設定されていません';

/** 接続設定の無いビルド用。購読するとすぐ設定が無いことを返す */
export const unconfiguredRemote: BacklogRemote = {
  subscribe(_onData, onError) {
    onError(UNCONFIGURED_MESSAGE);
    return () => {};
  },
  apply: () => Promise.reject(new Error(UNCONFIGURED_MESSAGE)),
};

/** 共有データは Firestore の backlogs/shared 1件に、エクスポートと同じ JSON 文字列で置く */
export function createFirestoreRemote(config: FirebaseConfig): BacklogRemote {
  const db = getFirestore(initializeApp(config));
  const ref = doc(db, 'backlogs', 'shared');

  return {
    subscribe(onData, onError) {
      return onSnapshot(
        ref,
        (snapshot) => {
          if (!snapshot.exists()) onData({ kind: 'missing' });
          // json が文字列でなければ、読めないデータとして受け取った側の検証で落とす
          else onData({ kind: 'text', text: textOf(snapshot.get('json')), ops: opsOf(snapshot.get('ops')) });
        },
        (error) => onError(error.message),
      );
    },

    // 各操作を共有データの最新の内容に適用する。同時に操作されたら Firestore がトランザクションを再試行する
    apply(action, opId) {
      return runTransaction(db, async (tx) => {
        const snapshot = await tx.get(ref);
        const next = nextBacklog(snapshot.exists() ? textOf(snapshot.get('json')) : null, action);
        if (next === null) return false;
        tx.set(ref, {
          json: serializeBacklog(next),
          ops: appendOp(opsOf(snapshot.get('ops')), opId),
          updatedAt: serverTimestamp(),
        });
        return true;
      });
    },
  };
}

function textOf(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function opsOf(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}
