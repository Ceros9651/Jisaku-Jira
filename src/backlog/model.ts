export type Status = 'todo' | 'in_progress' | 'done';

export const STATUSES: readonly Status[] = ['todo', 'in_progress', 'done'];

export const STATUS_LABELS: Record<Status, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

export type Pbi = {
  /** 表示 ID は `PBI-${number}` */
  number: number;
  title: string;
  description: string;
  acceptanceCriteria: string;
  status: Status;
  storyPoints: number | null;
  /** ISO 8601 */
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  /** 内部の識別子。名前は変えられ、重複もありうるため。PBI のリンクにも使う */
  id: number;
  name: string;
  /** このプロジェクトで次に発行する PBI の番号。削除しても減らさない */
  nextNumber: number;
  /** 配列の順序がこのプロジェクトのバックログの並び順 */
  items: Pbi[];
};

export type Backlog = {
  version: 3;
  /** 次に発行するプロジェクトの id。削除しても減らさない */
  nextProjectId: number;
  /** 配列の順序がタブの順序。常に1つ以上 */
  projects: Project[];
};

export const DEFAULT_PROJECT_NAME = 'マイプロジェクト';

export function emptyBacklog(): Backlog {
  return {
    version: 3,
    nextProjectId: 2,
    projects: [{ id: 1, name: DEFAULT_PROJECT_NAME, nextNumber: 1, items: [] }],
  };
}

/** PBI の番号はプロジェクトごとの連番なので、プロジェクトの id と番号の組で PBI を指す */
export type PbiRef = { projectId: number; number: number };

/** 以前の形式のリンク `#PBI-3` は、最初のタブのプロジェクトの PBI を指す */
export type SelectedRef = PbiRef | { projectId: 'first'; number: number };

/** 'first' を最初のプロジェクトの id に直す */
export function resolveRef(backlog: Backlog, ref: SelectedRef): PbiRef {
  return ref.projectId === 'first' ? { projectId: backlog.projects[0].id, number: ref.number } : ref;
}

/** 指した PBI と、それが属するプロジェクト。無ければ null */
export function findPbi(backlog: Backlog, ref: PbiRef): { project: Project; pbi: Pbi } | null {
  const project = backlog.projects.find((p) => p.id === ref.projectId);
  const pbi = project?.items.find((p) => p.number === ref.number);
  return project && pbi ? { project, pbi } : null;
}

export function countItems(backlog: Backlog): number {
  return backlog.projects.reduce((sum, p) => sum + p.items.length, 0);
}

export function formatPbiId(number: number): string {
  return `PBI-${number}`;
}

/** `PBI-3` → 3。形式が違えば null */
export function parsePbiId(id: string): number | null {
  const match = /^PBI-([1-9]\d*)$/.exec(id);
  return match ? Number(match[1]) : null;
}

export function isStatus(value: unknown): value is Status {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value);
}

export function isValidStoryPoints(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isInteger(value) && value >= 0);
}

export const TITLE_REQUIRED = 'タイトルを入力してください';
export const PROJECT_NAME_REQUIRED = 'プロジェクト名を入力してください';
export const STORY_POINTS_INVALID = 'ストーリーポイントは 0 以上の整数で入力してください';

/** 前後の空白を除いたタイトル。空なら null */
export function normalizeTitle(title: string): string | null {
  const trimmed = title.trim();
  return trimmed === '' ? null : trimmed;
}

/** 入力欄の文字列をストーリーポイントに変換する。空は未設定、不正なら undefined */
export function parseStoryPointsInput(input: string): number | null | undefined {
  const trimmed = input.trim();
  if (trimmed === '') return null;
  if (!/^\d+$/.test(trimmed)) return undefined;
  return Number(trimmed);
}
