import {
  type Announcements,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  type ScreenReaderInstructions,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type CSSProperties, type ReactNode, type Ref, useEffect, useRef, useState } from 'react';
import { type Pbi, type Status, formatPbiId } from '../backlog/model';
import { formatPbiMarkdown, pbiUrl } from '../backlog/share';
import styles from './BacklogTable.module.css';
import { CategoryIcon } from './CategoryIcon';
import { StatusSelect } from './StatusSelect';

type Props = {
  /** items が属するプロジェクト。コピーするリンクに使う */
  projectId: number;
  items: Pbi[];
  selected: number | null;
  onSelect: (number: number) => void;
  onStatusChange: (number: number, status: Status) => void;
  /** 削除ボタンが押されたとき。確認と削除は呼び出し側が行う */
  onDelete: (number: number) => void;
  /** 並べ替えできる表のときに使う。移動先は、ドロップした位置にある PBI の番号 */
  onMove?: (number: number, overNumber: number) => void;
  /** false のときは並べ替えの持ち手を出さず、ドラッグでもキーボードでも動かさない */
  sortable?: boolean;
  /** 表の名前。labelledBy があればそちらを使う */
  label?: string;
  labelledBy?: string;
};

export function BacklogTable({
  projectId,
  items,
  selected,
  onSelect,
  onStatusChange,
  onDelete,
  onMove,
  sortable = true,
  label,
  labelledBy,
}: Props) {
  const [copyMessage, setCopyMessage] = useState('');
  const Row = sortable ? SortableRow : StaticRow;

  const table = (
    <>
      <table className={styles.table} aria-label={labelledBy ? undefined : label} aria-labelledby={labelledBy}>
        <thead>
          <tr>
            <th className={styles.handleCol}>
              <span className="visually-hidden">並べ替え</span>
            </th>
            <th className={styles.typeCol}>
              <span className="visually-hidden">カテゴリ</span>
            </th>
            <th className={styles.idCol}>
              <span className="visually-hidden">ID</span>
            </th>
            <th>
              <span className="visually-hidden">タイトル</span>
            </th>
            <th className={styles.statusCol}>
              <span className="visually-hidden">ステータス</span>
            </th>
            <th className={styles.pointsCol}>
              <span className="visually-hidden">SP</span>
            </th>
            <th className={styles.copyCol}>
              <span className="visually-hidden">コピー</span>
            </th>
            <th className={styles.deleteCol}>
              <span className="visually-hidden">削除</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((pbi) => (
            <Row
              key={pbi.number}
              projectId={projectId}
              pbi={pbi}
              selected={pbi.number === selected}
              onSelect={onSelect}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
              onCopyResult={setCopyMessage}
            />
          ))}
        </tbody>
      </table>
      <p role="status" className="visually-hidden">
        {copyMessage}
      </p>
    </>
  );

  return sortable ? (
    <SortableList items={items} onMove={onMove}>
      {table}
    </SortableList>
  ) : (
    table
  );
}

type SortableListProps = {
  items: Pbi[];
  onMove?: (number: number, overNumber: number) => void;
  children: ReactNode;
};

function SortableList({ items, onMove, children }: SortableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const idOf = (id: string | number) => formatPbiId(Number(id));
  const positionOf = (id: string | number) => items.findIndex((p) => p.number === Number(id)) + 1;

  const announcements: Announcements = {
    onDragStart: ({ active }) => `${idOf(active.id)} を持ち上げました。${positionOf(active.id)} 番目です。`,
    onDragOver: ({ active, over }) =>
      over ? `${idOf(active.id)} を ${positionOf(over.id)} 番目に移動します。` : `${idOf(active.id)} は移動先の外にあります。`,
    onDragEnd: ({ active, over }) =>
      over ? `${idOf(active.id)} を ${positionOf(over.id)} 番目に置きました。` : `${idOf(active.id)} を元の位置に戻しました。`,
    onDragCancel: ({ active }) => `並べ替えを取り消しました。${idOf(active.id)} は元の位置です。`,
  };
  const screenReaderInstructions: ScreenReaderInstructions = {
    draggable: 'スペースキーで持ち上げ、上下の矢印キーで移動し、もう一度スペースキーで置きます。Escape で取り消します。',
  };

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    onMove?.(Number(active.id), Number(over.id));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
      accessibility={{ announcements, screenReaderInstructions }}
    >
      <SortableContext items={items.map((p) => p.number)} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

type RowProps = {
  projectId: number;
  pbi: Pbi;
  selected: boolean;
  onSelect: (number: number) => void;
  onStatusChange: (number: number, status: Status) => void;
  onDelete: (number: number) => void;
  onCopyResult: (message: string) => void;
};

function SortableRow(props: RowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: props.pbi.number,
  });

  return (
    <RowCells
      {...props}
      rowRef={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      dragging={isDragging}
      handle={
        <button
          type="button"
          ref={setActivatorNodeRef}
          className={styles.handle}
          aria-label={`${formatPbiId(props.pbi.number)} を並べ替え`}
          {...attributes}
          {...listeners}
        >
          <svg width="8" height="14" viewBox="0 0 8 14" aria-hidden="true">
            <g fill="currentColor">
              <circle cx="2" cy="2" r="1.2" />
              <circle cx="6" cy="2" r="1.2" />
              <circle cx="2" cy="7" r="1.2" />
              <circle cx="6" cy="7" r="1.2" />
              <circle cx="2" cy="12" r="1.2" />
              <circle cx="6" cy="12" r="1.2" />
            </g>
          </svg>
        </button>
      }
    />
  );
}

/** 並べ替えない表の行。持ち手の列は空のまま残し、並べ替えできる表と列の幅を揃える */
function StaticRow(props: RowProps) {
  return <RowCells {...props} />;
}

type CopyState = 'idle' | 'copied' | 'failed';

/** コピーのアイコン（四角を2つ重ねた線画）。成功したときはチェックに替える */
function CopyIcon({ done }: { done: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      {done ? (
        <path d="M3 8.5l3.5 3.5L13 4.5" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <>
          <rect x="5.75" y="5.75" width="8" height="8" rx="1.25" />
          <path d="M10.25 3.5v-.5A1.25 1.25 0 0 0 9 1.75H3A1.25 1.25 0 0 0 1.75 3v6A1.25 1.25 0 0 0 3 10.25h.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

/** 削除のアイコン（ゴミ箱の線画） */
function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M2.5 4h11M6 4V2.75h4V4M3.75 4l.6 9.25h7.3l.6-9.25M6.75 6.75v4M9.25 6.75v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 結果の表示を元に戻すまでの時間 */
const COPY_RESET_MS = 2000;

type RowCellsProps = RowProps & {
  rowRef?: Ref<HTMLTableRowElement>;
  style?: CSSProperties;
  dragging?: boolean;
  handle?: ReactNode;
};

function RowCells({
  projectId,
  pbi,
  selected,
  onSelect,
  onStatusChange,
  onDelete,
  onCopyResult,
  rowRef,
  style,
  dragging = false,
  handle,
}: RowCellsProps) {
  const id = formatPbiId(pbi.number);
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  async function copy() {
    let ok = false;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(formatPbiMarkdown(pbi, pbiUrl({ projectId, number: pbi.number }, window.location)));
        ok = true;
      }
    } catch {
      ok = false;
    }
    setCopyState(ok ? 'copied' : 'failed');
    onCopyResult(ok ? `${id} をコピーしました` : `${id} をコピーできませんでした`);
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopyState('idle'), COPY_RESET_MS);
  }

  return (
    <tr
      ref={rowRef}
      style={style}
      className={[styles.row, selected && styles.selected, dragging && styles.dragging].filter(Boolean).join(' ')}
      aria-selected={selected}
    >
      <td className={styles.handleCol}>{handle}</td>
      <td className={styles.typeCol}>
        <CategoryIcon category={pbi.category} />
      </td>
      <td className={[styles.idCol, pbi.status === 'done' && styles.doneId].filter(Boolean).join(' ')}>{id}</td>
      <td className={styles.titleCell}>
        <button type="button" className={styles.title} onClick={() => onSelect(pbi.number)}>
          {pbi.title}
        </button>
      </td>
      <td className={styles.statusCol}>
        <StatusSelect
          value={pbi.status}
          onChange={(status) => onStatusChange(pbi.number, status)}
          label={`${id} のステータス`}
        />
      </td>
      <td className={styles.pointsCol}>
        {pbi.storyPoints === null ? (
          <span className={styles.points}>
            <span aria-hidden="true">-</span>
            <span className="visually-hidden">未設定</span>
          </span>
        ) : (
          <span className={styles.points}>{pbi.storyPoints}</span>
        )}
      </td>
      <td className={styles.copyCol}>
        <button
          type="button"
          className={styles.copy}
          aria-label={`${id} をコピー`}
          title="コピー"
          data-copy-state={copyState}
          onClick={() => void copy()}
        >
          <CopyIcon done={copyState === 'copied'} />
        </button>
      </td>
      <td className={styles.deleteCol}>
        <button
          type="button"
          className={styles.delete}
          aria-label={`${id} を削除`}
          title="削除"
          onClick={() => onDelete(pbi.number)}
        >
          <TrashIcon />
        </button>
      </td>
    </tr>
  );
}
