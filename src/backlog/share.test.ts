import type { Pbi } from './model';
import { formatPbiMarkdown, pbiUrl } from './share';

const now = '2026-10-12T00:00:00.000Z';

function pbi(overrides: Partial<Pbi>): Pbi {
  return {
    number: 1,
    title: 't',
    description: '',
    acceptanceCriteria: '',
    category: 'task',
    status: 'todo',
    storyPoints: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('pbiUrl', () => {
  test('クエリと既存のハッシュを捨てて #<プロジェクトの id>/PBI-<番号> を付ける', () => {
    const location = new URL('http://localhost:5173/Jisaku-Jira/?reload=1#1/PBI-2');
    expect(pbiUrl({ projectId: 2, number: 5 }, location)).toBe('http://localhost:5173/Jisaku-Jira/#2/PBI-5');
  });
});

describe('formatPbiMarkdown', () => {
  test('すべての項目がある PBI', () => {
    const url = pbiUrl({ projectId: 1, number: 3 }, new URL('https://ceros9651.github.io/Jisaku-Jira/'));
    const markdown = formatPbiMarkdown(
      pbi({
        number: 3,
        title: 'ログイン画面を作る',
        status: 'in_progress',
        storyPoints: 5,
        description: 'メールアドレスとパスワードでログインできる。',
        acceptanceCriteria: '- 正しいメールアドレスとパスワードでログインできる\n- 誤ったパスワードではエラーが表示される',
      }),
      url,
    );
    expect(markdown).toBe(
      [
        '## PBI-3 ログイン画面を作る',
        '',
        '- リンク: https://ceros9651.github.io/Jisaku-Jira/#1/PBI-3',
        '- カテゴリ: タスク',
        '- ステータス: In Progress',
        '- ストーリーポイント: 5',
        '',
        '### 説明',
        '',
        'メールアドレスとパスワードでログインできる。',
        '',
        '### 受入条件',
        '',
        '- 正しいメールアドレスとパスワードでログインできる',
        '- 誤ったパスワードではエラーが表示される',
        '',
      ].join('\n'),
    );
  });

  test('カテゴリがバグなら、リンクの行の次に「- カテゴリ: バグ」の行が入る', () => {
    const markdown = formatPbiMarkdown(pbi({ number: 4, category: 'bug' }), 'u');
    expect(markdown).toContain('- リンク: u\n- カテゴリ: バグ\n');
  });

  test('SP 未設定は「未設定」、空白だけの説明と空の受入条件は「（なし）」', () => {
    const markdown = formatPbiMarkdown(pbi({ description: '  \n ' }), 'u');
    expect(markdown).toContain('- ストーリーポイント: 未設定\n');
    expect(markdown.endsWith('### 説明\n\n（なし）\n\n### 受入条件\n\n（なし）\n')).toBe(true);
  });

  test('空白だけの受入条件も「（なし）」', () => {
    const markdown = formatPbiMarkdown(pbi({ acceptanceCriteria: ' \n\n ' }), 'u');
    expect(markdown.endsWith('### 受入条件\n\n（なし）\n')).toBe(true);
  });

  test('SP 0 はそのまま 0', () => {
    expect(formatPbiMarkdown(pbi({ storyPoints: 0 }), 'u')).toContain('- ストーリーポイント: 0\n');
  });

  test('複数行の説明はそのまま入れる', () => {
    const markdown = formatPbiMarkdown(pbi({ description: '1行目\n\n- 箇条書き\n' }), 'u');
    expect(markdown).toContain('### 説明\n\n1行目\n\n- 箇条書き\n\n### 受入条件');
  });
});
