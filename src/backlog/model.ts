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
  status: Status;
  storyPoints: number | null;
  /** ISO 8601 */
  createdAt: string;
  updatedAt: string;
};

export type Backlog = {
  version: 1;
  /** 次に発行する番号。削除しても減らさない */
  nextNumber: number;
  /** 配列の順序がバックログの並び順 */
  items: Pbi[];
};

export function emptyBacklog(): Backlog {
  return { version: 1, nextNumber: 1, items: [] };
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
