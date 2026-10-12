import { useEffect, useRef, useState } from 'react';
import type { Project } from '../backlog/model';
import { ProjectNameForm } from './ProjectNameForm';
import styles from './ProjectTabs.module.css';

export const PROJECT_PANEL_ID = 'project-panel';

export function projectTabId(id: number): string {
  return `project-tab-${id}`;
}

type Props = {
  projects: Project[];
  activeId: number;
  onSelect: (id: number) => void;
  onCreate: (name: string) => void;
};

/** プロジェクトの切り替え。WAI-ARIA の tabs パターン（矢印キーで移動と同時に選択する） */
export function ProjectTabs({ projects, activeId, onSelect, onCreate }: Props) {
  const [adding, setAdding] = useState(false);
  const tabRefs = useRef(new Map<number, HTMLButtonElement>());
  const addRef = useRef<HTMLButtonElement>(null);
  // 作成した直後だけ、新しいタブにフォーカスを移す
  const focusActive = useRef(false);

  // 帯が横にスクロールするとき、選択中のタブを見える位置に出す
  useEffect(() => {
    tabRefs.current.get(activeId)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [activeId]);

  useEffect(() => {
    if (!focusActive.current) return;
    focusActive.current = false;
    tabRefs.current.get(activeId)?.focus();
  }, [activeId, projects]);

  function moveTo(index: number) {
    const project = projects[(index + projects.length) % projects.length];
    onSelect(project.id);
    tabRefs.current.get(project.id)?.focus();
  }

  return (
    <nav className={styles.bar} aria-label="プロジェクト">
      <div
        role="tablist"
        className={styles.tablist}
        onKeyDown={(e) => {
          const index = projects.findIndex((p) => p.id === activeId);
          const keys: Record<string, number> = {
            ArrowRight: index + 1,
            ArrowLeft: index - 1,
            Home: 0,
            End: projects.length - 1,
          };
          if (!(e.key in keys)) return;
          e.preventDefault();
          moveTo(keys[e.key]);
        }}
      >
        {projects.map((project) => {
          const selected = project.id === activeId;
          return (
            <button
              key={project.id}
              ref={(el) => {
                if (el) tabRefs.current.set(project.id, el);
                else tabRefs.current.delete(project.id);
              }}
              type="button"
              role="tab"
              id={projectTabId(project.id)}
              aria-selected={selected}
              aria-controls={PROJECT_PANEL_ID}
              tabIndex={selected ? 0 : -1}
              className={styles.tab}
              data-name={project.name}
              onClick={() => onSelect(project.id)}
            >
              {project.name}
            </button>
          );
        })}
      </div>

      {adding ? (
        <ProjectNameForm
          label="新しいプロジェクトの名前"
          onSubmit={(name) => {
            focusActive.current = true;
            setAdding(false);
            onCreate(name);
          }}
          onCancel={() => {
            setAdding(false);
            requestAnimationFrame(() => addRef.current?.focus());
          }}
        />
      ) : (
        <button ref={addRef} type="button" className={styles.add} onClick={() => setAdding(true)}>
          プロジェクトを追加
        </button>
      )}
    </nav>
  );
}
