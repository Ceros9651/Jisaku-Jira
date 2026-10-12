import { useEffect, useId, useRef, useState } from 'react';
import { PROJECT_NAME_REQUIRED, normalizeTitle } from '../backlog/model';
import styles from './ProjectNameForm.module.css';

type Props = {
  label: string;
  initialName?: string;
  /** 見出しの位置で使うときは大きな文字にする */
  size?: 'tab' | 'heading';
  onSubmit: (name: string) => void;
  onCancel: () => void;
};

/**
 * プロジェクト名の入力欄。Enter で確定、Escape で取り消す。
 * focus を外したときは、空なら取り消し、入力があれば確定する。
 */
export function ProjectNameForm({ label, initialName = '', size = 'tab', onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Escape や確定で閉じるときに、続く blur で二重に処理しない
  const done = useRef(false);
  const errorId = useId();

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function submit() {
    const normalized = normalizeTitle(name);
    if (normalized === null) {
      setError(PROJECT_NAME_REQUIRED);
      return;
    }
    done.current = true;
    onSubmit(normalized);
  }

  function cancel() {
    done.current = true;
    onCancel();
  }

  return (
    <form
      className={size === 'heading' ? styles.heading : styles.tab}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        ref={inputRef}
        className={styles.input}
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (error) setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            cancel();
          }
        }}
        onBlur={() => {
          if (done.current) return;
          if (normalizeTitle(name) === null) cancel();
          else submit();
        }}
        aria-label={label}
        placeholder="プロジェクト名"
        aria-invalid={error !== null}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <span id={errorId} role="alert" className={styles.error}>
          {error}
        </span>
      )}
    </form>
  );
}
