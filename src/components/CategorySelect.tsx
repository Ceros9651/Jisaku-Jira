import { CATEGORIES, CATEGORY_LABELS, type Category, isCategory } from '../backlog/model';
import { CategoryIcon } from './CategoryIcon';
import styles from './CategorySelect.module.css';

type Props = {
  value: Category;
  onChange: (category: Category) => void;
  label: string;
  id?: string;
};

/**
 * ネイティブの選択肢の中には SVG を出せないため、選んでいるカテゴリのアイコンを select の左に1つだけ置く。
 * 読み上げは select の値だけにし、アイコンは外す（名前の二重読みを避ける）
 */
export function CategorySelect({ value, onChange, label, id }: Props) {
  return (
    <span className={styles.wrap}>
      <CategoryIcon category={value} ariaHidden />
      <select
        id={id}
        className={styles.select}
        value={value}
        aria-label={label}
        onChange={(e) => {
          if (isCategory(e.target.value)) onChange(e.target.value);
        }}
      >
        {CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {CATEGORY_LABELS[category]}
          </option>
        ))}
      </select>
    </span>
  );
}
