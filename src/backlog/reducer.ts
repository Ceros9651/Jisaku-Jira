import {
  type Backlog,
  type Pbi,
  type Project,
  type Status,
  isStatus,
  isValidStoryPoints,
  normalizeTitle,
} from './model';

export type PbiChanges = Partial<Pick<Pbi, 'title' | 'description' | 'status' | 'storyPoints'>>;

export type BacklogAction =
  | {
      type: 'create';
      projectId: number;
      title: string;
      description?: string;
      storyPoints?: number | null;
      now: string;
    }
  | { type: 'update'; number: number; changes: PbiChanges; now: string }
  | { type: 'delete'; number: number }
  | { type: 'move'; number: number; toIndex: number }
  | { type: 'createProject'; name: string }
  | { type: 'renameProject'; id: number; name: string }
  | { type: 'deleteProject'; id: number }
  | { type: 'replace'; backlog: Backlog };

/**
 * 不正な操作（空タイトル・空の名前、不正なストーリーポイント、存在しない番号や id、最後のプロジェクトの削除）は
 * 無視して元の状態を返す。利用者へのエラー表示は呼び出し側で model の検証関数を使って行う。
 * PBI の番号は全プロジェクトで一意なので、PBI の操作は番号だけで指す。
 */
export function backlogReducer(state: Backlog, action: BacklogAction): Backlog {
  switch (action.type) {
    case 'create': {
      const title = normalizeTitle(action.title);
      const storyPoints = action.storyPoints ?? null;
      if (title === null || !isValidStoryPoints(storyPoints)) return state;
      if (!state.projects.some((p) => p.id === action.projectId)) return state;
      const pbi: Pbi = {
        number: state.nextNumber,
        title,
        description: action.description ?? '',
        status: 'todo',
        storyPoints,
        createdAt: action.now,
        updatedAt: action.now,
      };
      return {
        ...state,
        nextNumber: state.nextNumber + 1,
        projects: state.projects.map((p) => (p.id === action.projectId ? { ...p, items: [...p.items, pbi] } : p)),
      };
    }

    case 'update':
      return updateItems(state, action.number, (items) => {
        const index = items.findIndex((p) => p.number === action.number);
        const next = applyChanges(items[index], action.changes, action.now);
        if (next === null) return null;
        const updated = [...items];
        updated[index] = next;
        return updated;
      });

    case 'delete':
      return updateItems(state, action.number, (items) => items.filter((p) => p.number !== action.number));

    case 'move':
      return updateItems(state, action.number, (items) => {
        const from = items.findIndex((p) => p.number === action.number);
        const to = Math.max(0, Math.min(action.toIndex, items.length - 1));
        if (from === to) return null;
        const moved = [...items];
        const [pbi] = moved.splice(from, 1);
        moved.splice(to, 0, pbi);
        return moved;
      });

    case 'createProject': {
      const name = normalizeTitle(action.name);
      if (name === null) return state;
      const project: Project = { id: state.nextProjectId, name, items: [] };
      return { ...state, nextProjectId: state.nextProjectId + 1, projects: [...state.projects, project] };
    }

    case 'renameProject': {
      const name = normalizeTitle(action.name);
      if (name === null || !state.projects.some((p) => p.id === action.id)) return state;
      return { ...state, projects: state.projects.map((p) => (p.id === action.id ? { ...p, name } : p)) };
    }

    case 'deleteProject': {
      if (state.projects.length <= 1) return state;
      const projects = state.projects.filter((p) => p.id !== action.id);
      if (projects.length === state.projects.length) return state;
      return { ...state, projects };
    }

    case 'replace':
      return action.backlog;
  }
}

/** 番号の PBI を持つプロジェクトの items だけを差し替える。見つからない、または update が null なら元の状態 */
function updateItems(state: Backlog, number: number, update: (items: Pbi[]) => Pbi[] | null): Backlog {
  const index = state.projects.findIndex((p) => p.items.some((pbi) => pbi.number === number));
  if (index === -1) return state;
  const items = update(state.projects[index].items);
  if (items === null) return state;
  const projects = [...state.projects];
  projects[index] = { ...projects[index], items };
  return { ...state, projects };
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
