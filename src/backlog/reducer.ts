import {
  type Backlog,
  type Category,
  DEFAULT_CATEGORY,
  type Pbi,
  type PbiRef,
  type Project,
  type Status,
  isCategory,
  isStatus,
  isValidStoryPoints,
  normalizeTitle,
} from './model';

export type PbiChanges = Partial<
  Pick<Pbi, 'title' | 'description' | 'acceptanceCriteria' | 'category' | 'status' | 'storyPoints'>
>;

export type BacklogAction =
  | {
      type: 'create';
      projectId: number;
      title: string;
      description?: string;
      category?: Category;
      storyPoints?: number | null;
      now: string;
    }
  | { type: 'update'; projectId: number; number: number; changes: PbiChanges; now: string }
  | { type: 'delete'; projectId: number; number: number }
  | { type: 'move'; projectId: number; number: number; toIndex: number }
  | { type: 'createProject'; name: string }
  | { type: 'renameProject'; id: number; name: string }
  | { type: 'deleteProject'; id: number }
  | { type: 'replace'; backlog: Backlog };

/**
 * 不正な操作（空タイトル・空の名前、不正なカテゴリ・ストーリーポイント、存在しない番号や id、最後のプロジェクトの削除）は
 * 無視して元の状態を返す。利用者へのエラー表示は呼び出し側で model の検証関数を使って行う。
 * PBI の番号はプロジェクトごとの連番なので、PBI の操作はプロジェクトの id と番号で指す。
 */
export function backlogReducer(state: Backlog, action: BacklogAction): Backlog {
  switch (action.type) {
    case 'create': {
      const title = normalizeTitle(action.title);
      const category = action.category ?? DEFAULT_CATEGORY;
      const storyPoints = action.storyPoints ?? null;
      if (title === null || !isCategory(category) || !isValidStoryPoints(storyPoints)) return state;
      const project = state.projects.find((p) => p.id === action.projectId);
      if (!project) return state;
      const pbi: Pbi = {
        number: project.nextNumber,
        title,
        description: action.description ?? '',
        acceptanceCriteria: '',
        category,
        status: 'todo',
        storyPoints,
        createdAt: action.now,
        updatedAt: action.now,
      };
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === project.id ? { ...p, nextNumber: p.nextNumber + 1, items: [...p.items, pbi] } : p,
        ),
      };
    }

    case 'update':
      return updateItems(state, action, (items) => {
        const index = items.findIndex((p) => p.number === action.number);
        const next = applyChanges(items[index], action.changes, action.now);
        if (next === null) return null;
        const updated = [...items];
        updated[index] = next;
        return updated;
      });

    case 'delete':
      return updateItems(state, action, (items) => items.filter((p) => p.number !== action.number));

    case 'move':
      return updateItems(state, action, (items) => {
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
      const project: Project = { id: state.nextProjectId, name, nextNumber: 1, items: [] };
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

/** 指した PBI を持つプロジェクトの items だけを差し替える。見つからない、または update が null なら元の状態 */
function updateItems(state: Backlog, ref: PbiRef, update: (items: Pbi[]) => Pbi[] | null): Backlog {
  const index = state.projects.findIndex((p) => p.id === ref.projectId);
  if (index === -1 || !state.projects[index].items.some((pbi) => pbi.number === ref.number)) return state;
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
  if (changes.acceptanceCriteria !== undefined) next.acceptanceCriteria = changes.acceptanceCriteria;
  if (changes.category !== undefined) {
    if (!isCategory(changes.category)) return null;
    next.category = changes.category;
  }
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
