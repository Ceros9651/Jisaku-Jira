import type { Backlog } from './model';
import { serializeBacklog } from './storage';
import { type ValidationResult, parseBacklogJson } from './validate';

export function exportFileName(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `jisaku-jira-backlog-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}.json`;
}

/** バックログ全体を JSON ファイルとしてダウンロードさせる */
export function downloadBacklog(backlog: Backlog, date = new Date()): void {
  const blob = new Blob([serializeBacklog(backlog)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = exportFileName(date);
  link.click();
  URL.revokeObjectURL(url);
}

/** 選ばれたファイルを読み込んで検証する。置き換えは確認後に呼び出し側で行う */
export async function readBacklogFile(file: Blob): Promise<ValidationResult> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, reason: 'ファイルを読み込めませんでした' };
  }
  return parseBacklogJson(text);
}
