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
import { StatusSelect } from './StatusSelect';

type Props = {
  /** items が属するプロジェクト。コピーするリンクに使う */
  projectId: number;
  items: Pbi[];
  selected: number | null;
  onSelect: (number: number) => void;
  onStatusChange: (number: number, status: Status) => void;
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
            <th className={styles.idCol}>ID</th>
            <th>タイトル</th>
            <th className={styles.statusCol}>ステータス</th>
            <th className={styles.pointsCol}>SP</th>
            <th className={styles.copyCol}>
              <span className="visually-hidden">コピー</span>
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

const COPY_LABELS: Record<CopyState, string> = {
  idle: 'コピー',
  copied: 'コピー済み',
  failed: 'コピー失敗',
};

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
      <td className={styles.idCol}>{id}</td>
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
      <td className={styles.pointsCol}>{pbi.storyPoints ?? ''}</td>
      <td className={styles.copyCol}>
        <button type="button" className={styles.copy} aria-label={`${id} をコピー`} onClick={() => void copy()}>
          {COPY_LABELS[copyState]}
        </button>
      </td>
    </tr>
  );
}
