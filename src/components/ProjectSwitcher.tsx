import type { RefObject } from 'react';
import type { Project } from '../backlog/model';
import { ChevronDownIcon } from './icons';
import { Menu } from './Menu';

type Props = {
  projects: Project[];
  activeId: number;
  onSelect: (id: number) => void;
  onAdd: () => void;
  buttonRef?: RefObject<HTMLButtonElement | null>;
};

/** 見出しの横の、プロジェクトを切り替えるメニュー。作成した順に並べ、末尾にプロジェクトの追加を置く */
export function ProjectSwitcher({ projects, activeId, onSelect, onAdd, buttonRef }: Props) {
  return (
    <Menu
      label="プロジェクトを切り替え"
      buttonRef={buttonRef}
      items={[
        ...projects.map((project) => ({
          key: `project-${project.id}`,
          label: project.name,
          role: 'menuitemradio' as const,
          checked: project.id === activeId,
          onSelect: () => {
            if (project.id !== activeId) onSelect(project.id);
          },
        })),
        { key: 'add', label: 'プロジェクトを追加', separatorBefore: true, onSelect: onAdd },
      ]}
    >
      <ChevronDownIcon />
    </Menu>
  );
}
