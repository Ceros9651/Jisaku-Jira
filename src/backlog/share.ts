import { type Pbi, STATUS_LABELS, formatPbiId } from './model';

/** PBI を開くリンク。クエリと既存のハッシュは捨てる */
export function pbiUrl(number: number, location: Pick<Location, 'origin' | 'pathname'>): string {
  return `${location.origin}${location.pathname}#${formatPbiId(number)}`;
}

/** AI のチャットなどに貼るための、PBI のリンクと内容の Markdown */
export function formatPbiMarkdown(pbi: Pbi, url: string): string {
  const description = pbi.description.trim();
  const acceptanceCriteria = pbi.acceptanceCriteria.trim();
  return [
    `## ${formatPbiId(pbi.number)} ${pbi.title}`,
    '',
    `- リンク: ${url}`,
    `- ステータス: ${STATUS_LABELS[pbi.status]}`,
    `- ストーリーポイント: ${pbi.storyPoints ?? '未設定'}`,
    '',
    '### 説明',
    '',
    description === '' ? '（なし）' : description,
    '',
    '### 受入条件',
    '',
    acceptanceCriteria === '' ? '（なし）' : acceptanceCriteria,
    '',
  ].join('\n');
}
