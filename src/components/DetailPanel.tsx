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
import { CloseIcon, PbiTypeIcon } from './icons';
import { StatusSelect } from './StatusSelect';

type Props = {
  pbi: Pbi;
  onSave: (changes: PbiChanges) => void;
  onStatusChange: (status: Status) => void;
  onDelete: () => void;
  onClose: () => void;
};

type Errors = { title?: string; storyPoints?: string };

/** 呼び出し側で `key` にプロジェクトの id と番号を付け、PBI を切り替えたら下書きを捨てる */
export function DetailPanel({ pbi, onSave, onStatusChange, onDelete, onClose }: Props) {
  const id = formatPbiId(pbi.number);
  const [title, setTitle] = useState(pbi.title);
  const [description, setDescription] = useState(pbi.description);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState(pbi.acceptanceCriteria);
  const [storyPoints, setStoryPoints] = useState(pbi.storyPoints === null ? '' : String(pbi.storyPoints));
  const [errors, setErrors] = useState<Errors>({});
  const [saved, setSaved] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const dirty =
    title !== pbi.title ||
    description !== pbi.description ||
    acceptanceCriteria !== pbi.acceptanceCriteria ||
    storyPoints !== (pbi.storyPoints === null ? '' : String(pbi.storyPoints));

  function save() {
    const normalizedTitle = normalizeTitle(title);
    const parsedPoints = parseStoryPointsInput(storyPoints);
    const nextErrors: Errors = {};
    if (normalizedTitle === null) nextErrors.title = TITLE_REQUIRED;
    if (parsedPoints === undefined) nextErrors.storyPoints = STORY_POINTS_INVALID;
    setErrors(nextErrors);
    if (normalizedTitle === null || parsedPoints === undefined) return;

    onSave({ title: normalizedTitle, description, acceptanceCriteria, storyPoints: parsedPoints });
    setTitle(normalizedTitle);
    setStoryPoints(parsedPoints === null ? '' : String(parsedPoints));
    setSaved(true);
  }

  return (
    <aside className={styles.panel} aria-labelledby="detail-heading">
      <div className={styles.header}>
        <h2 id="detail-heading" className={styles.id}>
          <PbiTypeIcon />
          {id}
        </h2>
        <button type="button" className={styles.close} onClick={onClose} aria-label="詳細を閉じる">
          <CloseIcon />
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
          {/* Jira の詳細表示に倣い、タイトルは見出しとして見せる。ラベルは読み上げ用にだけ残す */}
          <span className="visually-hidden">タイトル</span>
          {/* 長いタイトルも Jira と同じく折り返して見せるため、1行の textarea にする。Enter は改行せず保存する */}
          <textarea
            className={styles.titleInput}
            value={title}
            rows={1}
            onChange={(e) => setTitle(e.target.value.replace(/\n/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            aria-invalid={errors.title !== undefined}
          />
          {errors.title && (
            <span role="alert" className={styles.error}>
              {errors.title}
            </span>
          )}
        </label>

        {/* Jira と同じく、ステータスはタイトルのすぐ下に置く。ラベルは読み上げ用にだけ残す */}
        <label className={styles.status}>
          <span className="visually-hidden">ステータス</span>
          <StatusSelect value={pbi.status} onChange={onStatusChange} label="ステータス" />
        </label>

        <label className={styles.field}>
          <span className={styles.sectionHeading}>説明</span>
          <textarea
            className={styles.longText}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={10}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.sectionHeading}>受入条件</span>
          <textarea
            className={styles.longText}
            value={acceptanceCriteria}
            onChange={(e) => setAcceptanceCriteria(e.target.value)}
            rows={6}
          />
        </label>

        <section className={styles.details} aria-labelledby="detail-details-heading">
          <h3 id="detail-details-heading" className={styles.detailsHeading}>
            詳細
          </h3>
          <label className={styles.detailRow}>
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
        </section>

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
