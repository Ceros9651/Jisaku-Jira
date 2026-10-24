import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { Category } from '../backlog/model';
import { CategorySelect } from './CategorySelect';

function Harness({ onChange }: { onChange: (c: Category) => void }) {
  const [value, setValue] = useState<Category>('task');
  return (
    <CategorySelect
      value={value}
      label="カテゴリ"
      onChange={(c) => {
        setValue(c);
        onChange(c);
      }}
    />
  );
}

test('選択肢はタスク・バグ・テスト・セキュリティの4つだけで、空の選択肢は無い', () => {
  render(<CategorySelect value="task" label="カテゴリ" onChange={() => {}} />);
  const select = screen.getByRole('combobox', { name: 'カテゴリ' });
  expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual([
    'タスク',
    'バグ',
    'テスト',
    'セキュリティ',
  ]);
});

test('選ぶと onChange にキーが渡り、表示中のアイコンが変わる', async () => {
  const onChange = vi.fn();
  const { container } = render(<Harness onChange={onChange} />);
  const iconFill = () => (container.querySelector('svg rect') as SVGElement).style.fill;
  expect(iconFill()).toBe('var(--category-task)');

  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'カテゴリ' }), 'バグ');

  expect(onChange).toHaveBeenCalledWith('bug');
  expect(iconFill()).toBe('var(--category-bug)');
});

test('アイコンは読み上げから外し、読み名は select だけにする', () => {
  render(<CategorySelect value="bug" label="カテゴリ" onChange={() => {}} />);
  expect(screen.queryByRole('img')).toBeNull();
});
