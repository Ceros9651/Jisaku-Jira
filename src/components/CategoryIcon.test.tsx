import { render, screen } from '@testing-library/react';
import { CATEGORIES, CATEGORY_LABELS } from '../backlog/model';
import { CategoryIcon } from './CategoryIcon';

test.each(CATEGORIES.map((c) => [CATEGORY_LABELS[c], c] as const))(
  '%s のアイコンはカテゴリ名の img として見つかり、<title> がカテゴリ名になる',
  (label, category) => {
    render(<CategoryIcon category={category} />);
    const icon = screen.getByRole('img', { name: label });
    expect(icon.querySelector('title')).toHaveTextContent(label);
  },
);

test('4つのカテゴリで記号の形が異なる', () => {
  const shapes = CATEGORIES.map((category) => {
    const { container, unmount } = render(<CategoryIcon category={category} />);
    // 地の四角を除いた記号の部分
    const symbol = [...container.querySelectorAll('svg > :not(title)')].slice(1).map((el) => el.outerHTML);
    unmount();
    return symbol.join('');
  });
  expect(new Set(shapes).size).toBe(4);
});

test('ariaHidden のときは読み上げから外れ、<title> も持たない', () => {
  const { container } = render(<CategoryIcon category="bug" ariaHidden />);
  expect(screen.queryByRole('img')).toBeNull();
  expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  expect(container.querySelector('title')).toBeNull();
});
