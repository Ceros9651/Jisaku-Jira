import {
  type Backlog,
  type Pbi,
  type Status,
  isStatus,
  isValidStoryPoints,
  normalizeTitle,
} from './model';

export type PbiChanges = Partial<Pick<Pbi, 'title' | 'description' | 'status' | 'storyPoints'>>;

export type BacklogAction =
  | { type: 'create'; title: string; description?: string; storyPoints?: number | null; now: string }
  | { type: 'update'; number: number; changes: PbiChanges; now: string }
  | { type: 'delete'; number: number }
  | { type: 'move'; number: number; toIndex: number }
  | { type: 'replace'; backlog: Backlog };

/**
 * 不正な操作（空タイトル、不正なストーリーポイント、存在しない番号）は無視して元の状態を返す。
 * 利用者へのエラー表示は呼び出し側で model の検証関数を使って行う。
 */
export function backlogReducer(state: Backlog, action: BacklogAction): Backlog {
  switch (action.type) {
    case 'create': {
      const title = normalizeTitle(action.title);
      const storyPoints = action.storyPoints ?? null;
      if (title === null || !isValidStoryPoints(storyPoints)) return state;
      const pbi: Pbi = {
        number: state.nextNumber,
        title,
        description: action.description ?? '',
        status: 'todo',
        storyPoints,
        createdAt: action.now,
        updatedAt: action.now,
      };
      return { ...state, nextNumber: state.nextNumber + 1, items: [...state.items, pbi] };
    }

    case 'update': {
      const index = state.items.findIndex((p) => p.number === action.number);
      if (index === -1) return state;
      const next = applyChanges(state.items[index], action.changes, action.now);
      if (next === null) return state;
      const items = [...state.items];
      items[index] = next;
      return { ...state, items };
    }

    case 'delete': {
      const items = state.items.filter((p) => p.number !== action.number);
      if (items.length === state.items.length) return state;
      return { ...state, items };
    }

    case 'move': {
      const from = state.items.findIndex((p) => p.number === action.number);
      if (from === -1) return state;
      const to = Math.max(0, Math.min(action.toIndex, state.items.length - 1));
      if (from === to) return state;
      const items = [...state.items];
      const [moved] = items.splice(from, 1);
      items.splice(to, 0, moved);
      return { ...state, items };
    }

    case 'replace':
      return action.backlog;
  }
}

function applyChanges(pbi: Pbi, changes: PbiChanges, now: string): Pbi | null {
  const next: Pbi = { ...pbi, updatedAt: now };
  if (changes.title !== undefined) {
    const title = normalizeTitle(changes.title);
    if (title === null) return null;
    next.title = title;
  }
  if (changes.description !== undefined) next.description = changes.description;
  if (changes.status !== undefined) {
    if (!isStatus(changes.status)) return null;
    next.status = changes.status satisfies Status;
  }
  if (changes.storyPoints !== undefined) {
    if (!isValidStoryPoints(changes.storyPoints)) return null;
    next.storyPoints = changes.storyPoints;
  }
  return next;
}
