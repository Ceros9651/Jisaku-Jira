import { MoreIcon } from './icons';
import { Menu } from './Menu';

type Props = {
  /** プロジェクトが1つだけのときは削除できない */
  canDelete: boolean;
  onRename: () => void;
  onDelete: () => void;
};

/** 見出しの横の「…」。選んでいるプロジェクトへの操作 */
export function ProjectActionsMenu({ canDelete, onRename, onDelete }: Props) {
  return (
    <Menu
      label="プロジェクトの操作"
      items={[
        { key: 'rename', label: '名前を変更', onSelect: onRename },
        {
          key: 'delete',
          label: '削除',
          disabledReason: canDelete ? undefined : 'プロジェクトが1つだけのときは削除できません',
          onSelect: onDelete,
        },
      ]}
    >
      <MoreIcon />
    </Menu>
  );
}
