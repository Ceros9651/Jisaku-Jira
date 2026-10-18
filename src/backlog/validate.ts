import { type Backlog, DEFAULT_PROJECT_NAME, type Pbi, type Project, isStatus, isValidStoryPoints } from './model';

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

/**
 * version 3 を検証する。旧形式は version 3 に変換する。
 * version 1（プロジェクトの無い形式）は「マイプロジェクト」1つに、
 * version 2（番号が全プロジェクトの通し番号）はプロジェクトごとの番号に振り直す。
 */
export function validateBacklog(data: unknown): ValidationResult {
  if (!isObject(data)) return fail('バックログのデータではありません');
  if (data.version === 1) return validateVersion1(data);
  if (data.version === 2) return validateVersion2(data);
  if (data.version === 3) return validateVersion3(data);
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
      version: 3,
      nextProjectId: 2,
      projects: [
        { id: 1, name: DEFAULT_PROJECT_NAME, nextNumber: atLeastNext(data.nextNumber, items.map((p) => p.number)), items },
      ],
    },
  };
}

/**
 * 最初のプロジェクトは番号を変えず、全体の nextNumber を引き継ぐ（削除済みの番号も再利用しない）。
 * 2つ目以降は並び順を変えずに、作成日時の古い順（同じなら元の番号の順）に 1 から振り直す。
 * どの端末で読んでも同じ番号になるよう、入力だけで結果が決まるようにする。
 */
function validateVersion2(data: Record<string, unknown>): ValidationResult {
  if (!isPositiveInteger(data.nextNumber)) return fail('nextNumber が正の整数ではありません');
  // 通し番号なので、振り直す前に番号の重複をプロジェクトをまたいで検出する
  const numbers = new Set<number>();
  const parsed = validateProjects(data, () => numbers);
  if (!parsed.ok) return parsed;
  const nextNumber = data.nextNumber;
  const projects = parsed.backlog.projects.map((project, index) =>
    index === 0 ? { ...project, nextNumber: atLeastNext(nextNumber, [...numbers]) } : renumber(project),
  );
  return { ok: true, backlog: { ...parsed.backlog, projects } };
}

function renumber(project: Project): Project {
  const byCreation = [...project.items].sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.number - b.number,
  );
  const numberOf = new Map(byCreation.map((p, index) => [p.number, index + 1]));
  return {
    ...project,
    nextNumber: project.items.length + 1,
    items: project.items.map((p) => ({ ...p, number: numberOf.get(p.number)! })),
  };
}

function validateVersion3(data: Record<string, unknown>): ValidationResult {
  // 番号はプロジェクトごとの連番なので、重複はプロジェクトの中だけで検出する
  return validateProjects(data, () => new Set());
}

/**
 * projects と nextProjectId を検証して version 3 にする。各プロジェクトの番号の重複は seenFor が返す集合で検出する。
 * nextNumber は version 3 ならプロジェクトの値を、無ければ（version 2）最大番号＋1 を使う。
 */
function validateProjects(data: Record<string, unknown>, seenFor: () => Set<number>): ValidationResult {
  if (!Array.isArray(data.projects)) return fail('projects がありません');
  if (data.projects.length === 0) return fail('プロジェクトが1つもありません');
  if (!isPositiveInteger(data.nextProjectId)) return fail('nextProjectId が正の整数ではありません');

  const projects: Project[] = [];
  const projectIds = new Set<number>();
  for (const [index, raw] of data.projects.entries()) {
    const label = `${index + 1} 番目のプロジェクト`;
    if (!isObject(raw)) return fail(`${label}がプロジェクトのデータではありません`);
    if (!isPositiveInteger(raw.id)) return fail(`${label}の id が正の整数ではありません`);
    if (projectIds.has(raw.id)) return fail(`プロジェクトの id ${raw.id} が重複しています`);
    projectIds.add(raw.id);
    if (typeof raw.name !== 'string' || raw.name.trim() === '') return fail(`${label}の name が空です`);
    if (!Array.isArray(raw.items)) return fail(`${label}の items がありません`);
    if (data.version === 3 && !isPositiveInteger(raw.nextNumber)) {
      return fail(`${label}の nextNumber が正の整数ではありません`);
    }
    const seen = seenFor();
    const items = validateItems(raw.items, seen, `${label}の`);
    if (typeof items === 'string') return fail(items);
    const nextNumber = atLeastNext(isPositiveInteger(raw.nextNumber) ? raw.nextNumber : 1, items.map((p) => p.number));
    projects.push({ id: raw.id, name: raw.name.trim(), nextNumber, items });
  }

  return {
    ok: true,
    backlog: { version: 3, nextProjectId: atLeastNext(data.nextProjectId, [...projectIds]), projects },
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
    if (!isStatus(raw.status)) return `${label}の status が不正です`;
    if (!isValidStoryPoints(raw.storyPoints)) return `${label}の storyPoints が不正です`;
    if (typeof raw.createdAt !== 'string' || typeof raw.updatedAt !== 'string') {
      return `${label}の createdAt / updatedAt が文字列ではありません`;
    }
    items.push({
      number: raw.number,
      title: raw.title.trim(),
      description: raw.description,
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
