import type { ReactNode } from 'react';
import { CATEGORY_LABELS, type Category } from '../backlog/model';

type Props = {
  category: Category;
  /** 隣にカテゴリ名の文字があるとき（CategorySelect）は読み上げから外す */
  ariaHidden?: boolean;
};

/** 白い記号。色を見分けられなくても形で区別できるよう、4つとも別の形にする。端は整数ピクセルに合わせる */
const SYMBOLS: Record<Category, ReactNode> = {
  task: <path d="M4 8l3 3 5-6" fill="none" stroke="#fff" strokeWidth="2" />,
  bug: <circle cx="8" cy="8" r="4" fill="#fff" />,
  // フラスコの形（細い首と三角の胴）
  test: <path d="M7 3h2v3l3 7H4l3-7z" fill="#fff" />,
  security: (
    <>
      <path d="M6 7V6a2 2 0 0 1 4 0v1" fill="none" stroke="#fff" strokeWidth="2" />
      <rect x="4" y="7" width="8" height="6" fill="#fff" />
    </>
  ),
};

/** 一覧の ID の左に置くカテゴリのアイコン。16px の格子で、カテゴリ色の地に白い記号を1つ置く */
export function CategoryIcon({ category, ariaHidden = false }: Props) {
  const label = CATEGORY_LABELS[category];
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      role={ariaHidden ? undefined : 'img'}
      aria-label={ariaHidden ? undefined : label}
      aria-hidden={ariaHidden || undefined}
      style={{ display: 'block', flexShrink: 0 }}
    >
      {/* hover の表示と読み上げ名を1つにするため、title 属性ではなく SVG の <title> を使う */}
      {!ariaHidden && <title>{label}</title>}
      <rect width="16" height="16" rx="2" style={{ fill: `var(--category-${category})` }} />
      {SYMBOLS[category]}
    </svg>
  );
}
