import {
  type Backlog,
  DEFAULT_CATEGORY,
  DEFAULT_PROJECT_NAME,
  type Pbi,
  type Project,
  isCategory,
  isStatus,
  isValidStoryPoints,
} from './model';

export type ValidationResult = { ok: true; backlog: Backlog } | { ok: false; reason: string };

/** JSON 文字列を検証して Backlog にする。エクスポートファイルと保存データの両方に使う */
export function parseBacklogJson(text: string): ValidationResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'JSON として読み込めません' };
  }
  return validateBacklog(data);
}

/** version 2 を検証する。プロジェクトの無い version 1 は「マイプロジェクト」1つの version 2 に変換する */
export function validateBacklog(data: unknown): ValidationResult {
  if (!isObject(data)) return fail('バックログのデータではありません');
  if (data.version === 1) return validateVersion1(data);
  if (data.version === 2) return validateVersion2(data);
  return fail(`対応していないデータ形式です（version: ${String(data.version)}）`);
}

function validateVersion1(data: Record<string, unknown>): ValidationResult {
  if (!Array.isArray(data.items)) return fail('items がありません');
  if (!isPositiveInteger(data.nextNumber)) return fail('nextNumber が正の整数ではありません');
  const items = validateItems(data.items, new Set(), '');
  if (typeof items === 'string') return fail(items);
  return {
    ok: true,
    backlog: {
      version: 2,
      nextNumber: atLeastNext(data.nextNumber, items.map((p) => p.number)),
      nextProjectId: 2,
      projects: [{ id: 1, name: DEFAULT_PROJECT_NAME, items }],
    },
  };
}

function validateVersion2(data: Record<string, unknown>): ValidationResult {
  if (!Array.isArray(data.projects)) return fail('projects がありません');
  if (data.projects.length === 0) return fail('プロジェクトが1つもありません');
  if (!isPositiveInteger(data.nextNumber)) return fail('nextNumber が正の整数ではありません');
  if (!isPositiveInteger(data.nextProjectId)) return fail('nextProjectId が正の整数ではありません');

  const projects: Project[] = [];
  const projectIds = new Set<number>();
  // 番号の重複はプロジェクトをまたいで検出する
  const numbers = new Set<number>();
  for (const [index, raw] of data.projects.entries()) {
    const label = `${index + 1} 番目のプロジェクト`;
    if (!isObject(raw)) return fail(`${label}がプロジェクトのデータではありません`);
    if (!isPositiveInteger(raw.id)) return fail(`${label}の id が正の整数ではありません`);
    if (projectIds.has(raw.id)) return fail(`プロジェクトの id ${raw.id} が重複しています`);
    projectIds.add(raw.id);
    if (typeof raw.name !== 'string' || raw.name.trim() === '') return fail(`${label}の name が空です`);
    if (!Array.isArray(raw.items)) return fail(`${label}の items がありません`);
    const items = validateItems(raw.items, numbers, `${label}の`);
    if (typeof items === 'string') return fail(items);
    projects.push({ id: raw.id, name: raw.name.trim(), items });
  }

  return {
    ok: true,
    backlog: {
      version: 2,
      nextNumber: atLeastNext(data.nextNumber, [...numbers]),
      nextProjectId: atLeastNext(data.nextProjectId, [...projectIds]),
      projects,
    },
  };
}

/** PBI の配列を検証する。不正なら理由の文字列を返す */
function validateItems(rawItems: unknown[], seen: Set<number>, prefix: string): Pbi[] | string {
  const items: Pbi[] = [];
  for (const [index, raw] of rawItems.entries()) {
    const label = `${prefix}${index + 1} 件目`;
    if (!isObject(raw)) return `${label}が PBI のデータではありません`;
    if (!isPositiveInteger(raw.number)) return `${label}の number が正の整数ではありません`;
    if (seen.has(raw.number)) return `番号 ${raw.number} が重複しています`;
    seen.add(raw.number);
    if (typeof raw.title !== 'string' || raw.title.trim() === '') return `${label}の title が空です`;
    if (typeof raw.description !== 'string') return `${label}の description が文字列ではありません`;
    // カテゴリを持たない以前のデータはタスクとして読む
    const category = raw.category === undefined ? DEFAULT_CATEGORY : raw.category;
    if (!isCategory(category)) return `${label}の category が不正です`;
    if (!isStatus(raw.status)) return `${label}の status が不正です`;
    if (!isValidStoryPoints(raw.storyPoints)) return `${label}の storyPoints が不正です`;
    if (typeof raw.createdAt !== 'string' || typeof raw.updatedAt !== 'string') {
      return `${label}の createdAt / updatedAt が文字列ではありません`;
    }
    items.push({
      number: raw.number,
      title: raw.title.trim(),
      description: raw.description,
      category,
      status: raw.status,
      storyPoints: raw.storyPoints,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
  return items;
}

/** 手で編集したファイルでも重複しないよう、既存の最大値より大きくする */
function atLeastNext(next: number, used: number[]): number {
  return Math.max(next, used.reduce((max, n) => Math.max(max, n), 0) + 1);
}

function fail(reason: string): ValidationResult {
  return { ok: false, reason };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}
