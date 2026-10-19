import { useState } from 'react';
import { TITLE_REQUIRED, normalizeTitle } from '../backlog/model';
import styles from './CreatePbiForm.module.css';
import { PlusIcon } from './icons';

type Props = {
  onCreate: (title: string) => void;
};

/** Jira のインライン作成に倣い、未完了の区画の末尾に置く「+ 作成」の行 */
export function CreatePbiForm({ onCreate }: Props) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const normalized = normalizeTitle(title);
        if (normalized === null) {
          setError(TITLE_REQUIRED);
          return;
        }
        onCreate(normalized);
        setTitle('');
        setError(null);
      }}
    >
      <div className={styles.row}>
        <span className={styles.plus}>
          <PlusIcon />
        </span>
        <input
          className={styles.input}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError(null);
          }}
          placeholder="作成"
          aria-label="新しい PBI のタイトル"
          aria-invalid={error !== null}
          aria-describedby={error ? 'create-pbi-error' : undefined}
        />
        <button type="submit" className={styles.button}>
          作成
        </button>
      </div>
      {error && (
        <p id="create-pbi-error" role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </form>
  );
}
