import { type Backlog, type Pbi, isStatus, isValidStoryPoints } from './model';

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

export function validateBacklog(data: unknown): ValidationResult {
  if (!isObject(data)) return fail('バックログのデータではありません');
  if (data.version !== 1) return fail(`対応していないデータ形式です（version: ${String(data.version)}）`);
  if (!Array.isArray(data.items)) return fail('items がありません');
  if (!isPositiveInteger(data.nextNumber)) return fail('nextNumber が正の整数ではありません');

  const items: Pbi[] = [];
  const seen = new Set<number>();
  for (const [index, raw] of data.items.entries()) {
    const label = `${index + 1} 件目`;
    if (!isObject(raw)) return fail(`${label}が PBI のデータではありません`);
    if (!isPositiveInteger(raw.number)) return fail(`${label}の number が正の整数ではありません`);
    if (seen.has(raw.number)) return fail(`番号 ${raw.number} が重複しています`);
    seen.add(raw.number);
    if (typeof raw.title !== 'string' || raw.title.trim() === '') return fail(`${label}の title が空です`);
    if (typeof raw.description !== 'string') return fail(`${label}の description が文字列ではありません`);
    if (!isStatus(raw.status)) return fail(`${label}の status が不正です`);
    if (!isValidStoryPoints(raw.storyPoints)) return fail(`${label}の storyPoints が不正です`);
    if (typeof raw.createdAt !== 'string' || typeof raw.updatedAt !== 'string') {
      return fail(`${label}の createdAt / updatedAt が文字列ではありません`);
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

  // 手で編集したファイルでも番号が重複しないよう、既存の最大番号より大きくする
  const maxNumber = items.reduce((max, p) => Math.max(max, p.number), 0);
  const nextNumber = Math.max(data.nextNumber, maxNumber + 1);

  return { ok: true, backlog: { version: 1, nextNumber, items } };
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
