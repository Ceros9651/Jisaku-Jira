import { type Pbi, type PbiRef, STATUS_LABELS, formatPbiId } from './model';

/** PBI を指す URL ハッシュ（`#` を除く）。番号はプロジェクトごとなので、プロジェクトの id を含める */
export function pbiHash(ref: PbiRef): string {
  return `${ref.projectId}/${formatPbiId(ref.number)}`;
}

/** PBI を開くリンク。クエリと既存のハッシュは捨てる */
export function pbiUrl(ref: PbiRef, location: Pick<Location, 'origin' | 'pathname'>): string {
  return `${location.origin}${location.pathname}#${pbiHash(ref)}`;
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
