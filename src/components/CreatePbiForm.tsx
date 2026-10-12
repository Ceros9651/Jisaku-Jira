import { useState } from 'react';
import { TITLE_REQUIRED, normalizeTitle } from '../backlog/model';
import styles from './CreatePbiForm.module.css';

type Props = {
  onCreate: (title: string) => void;
};

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
        <span className={styles.plus} aria-hidden="true">
          +
        </span>
        <input
          className={styles.input}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError(null);
          }}
          placeholder="タイトルを入力して Enter で PBI を作成"
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
