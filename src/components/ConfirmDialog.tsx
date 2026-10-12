import { type ReactNode, useEffect, useId, useRef } from 'react';
import styles from './ConfirmDialog.module.css';

type Props = {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** 確認ダイアログ。誤操作を避けるため、開いたときは取り消し側にフォーカスする */
export function ConfirmDialog({ title, children, confirmLabel, danger = false, onConfirm, onCancel }: Props) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => previous?.focus();
  }, []);

  return (
    <div className={styles.backdrop}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={styles.dialog}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
        }}
      >
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <div className={styles.body}>{children}</div>
        <div className={styles.actions}>
          <button type="button" ref={cancelRef} className={styles.cancel} onClick={onCancel}>
            キャンセル
          </button>
          <button type="button" className={danger ? styles.danger : styles.primary} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
