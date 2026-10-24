import { useState } from 'react';
import { type Category, DEFAULT_CATEGORY, TITLE_REQUIRED, normalizeTitle } from '../backlog/model';
import { CategorySelect } from './CategorySelect';
import styles from './CreatePbiForm.module.css';

type Props = {
  onCreate: (title: string, category: Category) => void;
};

export function CreatePbiForm({ onCreate }: Props) {
  const [title, setTitle] = useState('');
  // 同じ種類を続けて入力しやすいよう、作成後も直前に選んだカテゴリを残す
  const [category, setCategory] = useState<Category>(DEFAULT_CATEGORY);
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
        onCreate(normalized, category);
        setTitle('');
        setError(null);
      }}
    >
      <div className={styles.row}>
        <CategorySelect value={category} onChange={setCategory} label="新しい PBI のカテゴリ" />
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
