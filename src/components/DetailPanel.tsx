import { useState } from 'react';
import {
  type Pbi,
  STORY_POINTS_INVALID,
  type Status,
  TITLE_REQUIRED,
  formatPbiId,
  normalizeTitle,
  parseStoryPointsInput,
} from '../backlog/model';
import type { PbiChanges } from '../backlog/reducer';
import { ConfirmDialog } from './ConfirmDialog';
import styles from './DetailPanel.module.css';
import { StatusSelect } from './StatusSelect';

type Props = {
  pbi: Pbi;
  onSave: (changes: PbiChanges) => void;
  onStatusChange: (status: Status) => void;
  onDelete: () => void;
  onClose: () => void;
};

type Errors = { title?: string; storyPoints?: string };

/** 呼び出し側で `key={pbi.number}` を付け、PBI を切り替えたら下書きを捨てる */
export function DetailPanel({ pbi, onSave, onStatusChange, onDelete, onClose }: Props) {
  const id = formatPbiId(pbi.number);
  const [title, setTitle] = useState(pbi.title);
  const [description, setDescription] = useState(pbi.description);
  const [storyPoints, setStoryPoints] = useState(pbi.storyPoints === null ? '' : String(pbi.storyPoints));
  const [errors, setErrors] = useState<Errors>({});
  const [saved, setSaved] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const dirty =
    title !== pbi.title ||
    description !== pbi.description ||
    storyPoints !== (pbi.storyPoints === null ? '' : String(pbi.storyPoints));

  function save() {
    const normalizedTitle = normalizeTitle(title);
    const parsedPoints = parseStoryPointsInput(storyPoints);
    const nextErrors: Errors = {};
    if (normalizedTitle === null) nextErrors.title = TITLE_REQUIRED;
    if (parsedPoints === undefined) nextErrors.storyPoints = STORY_POINTS_INVALID;
    setErrors(nextErrors);
    if (normalizedTitle === null || parsedPoints === undefined) return;

    onSave({ title: normalizedTitle, description, storyPoints: parsedPoints });
    setTitle(normalizedTitle);
    setStoryPoints(parsedPoints === null ? '' : String(parsedPoints));
    setSaved(true);
  }

  return (
    <aside className={styles.panel} aria-labelledby="detail-heading">
      <div className={styles.header}>
        <h2 id="detail-heading" className={styles.id}>
          {id}
        </h2>
        <button type="button" className={styles.close} onClick={onClose} aria-label="詳細を閉じる">
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>

      <form
        className={styles.form}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        onChange={() => setSaved(false)}
      >
        <label className={styles.field}>
          <span className={styles.label}>タイトル</span>
          <input
            className={styles.titleInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-invalid={errors.title !== undefined}
          />
          {errors.title && (
            <span role="alert" className={styles.error}>
              {errors.title}
            </span>
          )}
        </label>

        <div className={styles.meta}>
          <label className={styles.field}>
            <span className={styles.label}>ステータス</span>
            <StatusSelect value={pbi.status} onChange={onStatusChange} label="ステータス" />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>ストーリーポイント</span>
            <input
              className={styles.pointsInput}
              value={storyPoints}
              onChange={(e) => setStoryPoints(e.target.value)}
              inputMode="numeric"
              aria-invalid={errors.storyPoints !== undefined}
            />
            {errors.storyPoints && (
              <span role="alert" className={styles.error}>
                {errors.storyPoints}
              </span>
            )}
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>説明</span>
          <textarea
            className={styles.description}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={10}
          />
        </label>

        <div className={styles.actions}>
          <button type="submit" className={styles.save} disabled={!dirty}>
            保存
          </button>
          {saved && !dirty && (
            <span className={styles.savedNote} role="status">
              保存しました
            </span>
          )}
          <button type="button" className={styles.delete} onClick={() => setConfirmingDelete(true)}>
            削除
          </button>
        </div>
      </form>

      {confirmingDelete && (
        <ConfirmDialog
          title={`${id} を削除しますか？`}
          confirmLabel="削除する"
          danger
          onConfirm={() => {
            setConfirmingDelete(false);
            onDelete();
          }}
          onCancel={() => setConfirmingDelete(false)}
        >
          <p>「{pbi.title}」を削除します。削除した ID は再利用されません。</p>
        </ConfirmDialog>
      )}
    </aside>
  );
}
