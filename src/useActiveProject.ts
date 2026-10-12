import { useEffect, useState } from 'react';
import { type Backlog, type Project, findPbi } from './backlog/model';
import { getStorage, loadActiveProject, saveActiveProject } from './backlog/storage';

/**
 * 選択中のプロジェクトを、ハッシュの PBI のプロジェクト → 記憶した id → 最初のプロジェクト の順で決める。
 * 決まったプロジェクトは記憶し、詳細パネルを閉じた後や再読み込みの後も同じタブに留まる。
 * `persist` が false の間（保存データの読み込みエラー中）は記憶を書き換えない。
 */
export function useActiveProject(
  backlog: Backlog,
  selectedPbi: number | null,
  persist: boolean,
  storage: Storage | null = getStorage(),
): [Project, (id: number) => void] {
  const [remembered, setRemembered] = useState(() => loadActiveProject(storage));

  const fromHash = selectedPbi === null ? null : findPbi(backlog, selectedPbi)?.project;
  const project = fromHash ?? backlog.projects.find((p) => p.id === remembered) ?? backlog.projects[0];

  useEffect(() => {
    if (!persist) return;
    setRemembered(project.id);
    saveActiveProject(storage, project.id);
  }, [storage, project.id, persist]);

  return [project, setRemembered];
}
