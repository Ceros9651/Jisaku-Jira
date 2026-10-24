import type { Pbi } from './model';
import { formatPbiMarkdown, pbiUrl } from './share';

const now = '2026-10-12T00:00:00.000Z';

function pbi(overrides: Partial<Pbi>): Pbi {
  return {
    number: 1,
    title: 't',
    description: '',
    category: 'task',
    status: 'todo',
    storyPoints: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('pbiUrl', () => {
  test('クエリと既存のハッシュを捨てて #PBI-<番号> を付ける', () => {
    const location = new URL('http://localhost:5173/Jisaku-Jira/?reload=1#PBI-2');
    expect(pbiUrl(5, location)).toBe('http://localhost:5173/Jisaku-Jira/#PBI-5');
  });
});

describe('formatPbiMarkdown', () => {
  test('すべての項目がある PBI', () => {
    const markdown = formatPbiMarkdown(
      pbi({
        number: 3,
        title: 'ログイン画面を作る',
        status: 'in_progress',
        storyPoints: 5,
        description: 'メールアドレスとパスワードでログインできる。',
      }),
      'https://ceros9651.github.io/Jisaku-Jira/#PBI-3',
    );
    expect(markdown).toBe(
      [
        '## PBI-3 ログイン画面を作る',
        '',
        '- リンク: https://ceros9651.github.io/Jisaku-Jira/#PBI-3',
        '- カテゴリ: タスク',
        '- ステータス: In Progress',
        '- ストーリーポイント: 5',
        '',
        '### 説明',
        '',
        'メールアドレスとパスワードでログインできる。',
        '',
      ].join('\n'),
    );
  });

  test('カテゴリがバグなら、リンクの行の次に「- カテゴリ: バグ」の行が入る', () => {
    const markdown = formatPbiMarkdown(pbi({ number: 4, category: 'bug' }), 'u');
    expect(markdown).toContain('- リンク: u\n- カテゴリ: バグ\n');
  });

  test('SP 未設定は「未設定」、空白だけの説明は「（なし）」', () => {
    const markdown = formatPbiMarkdown(pbi({ description: '  \n ' }), 'u');
    expect(markdown).toContain('- ストーリーポイント: 未設定\n');
    expect(markdown.endsWith('### 説明\n\n（なし）\n')).toBe(true);
  });

  test('SP 0 はそのまま 0', () => {
    expect(formatPbiMarkdown(pbi({ storyPoints: 0 }), 'u')).toContain('- ストーリーポイント: 0\n');
  });

  test('複数行の説明はそのまま入れる', () => {
    const markdown = formatPbiMarkdown(pbi({ description: '1行目\n\n- 箇条書き\n' }), 'u');
    expect(markdown.endsWith('### 説明\n\n1行目\n\n- 箇条書き\n')).toBe(true);
  });
});
