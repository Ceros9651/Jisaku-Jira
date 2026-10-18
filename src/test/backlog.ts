import { type Backlog, type Pbi, DEFAULT_PROJECT_NAME } from '../backlog/model';

const now = '2026-10-12T00:00:00.000Z';

export function pbi(number: number, fields: Partial<Omit<Pbi, 'number'>> = {}): Pbi {
  return {
    number,
    title: `PBI ${number}`,
    description: '',
    acceptanceCriteria: '',
    status: 'todo',
    storyPoints: null,
    createdAt: now,
    updatedAt: now,
    ...fields,
  };
}

/** テスト用。プロジェクト名と PBI の組から Backlog を作る。nextNumber は最大番号＋1 */
export function backlogOf(...projects: [name: string, items: Pbi[]][]): Backlog {
  const max = Math.max(0, ...projects.flatMap(([, items]) => items.map((p) => p.number)));
  return {
    version: 2,
    nextNumber: max + 1,
    nextProjectId: projects.length + 1,
    projects: projects.map(([name, items], index) => ({ id: index + 1, name, items })),
  };
}

/** テスト用。1つのプロジェクト「マイプロジェクト」に PBI を入れた Backlog */
export function singleProject(items: Pbi[]): Backlog {
  return backlogOf([DEFAULT_PROJECT_NAME, items]);
}
