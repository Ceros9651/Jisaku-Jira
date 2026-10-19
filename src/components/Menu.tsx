import { type ReactNode, type RefObject, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { CheckIcon } from './icons';
import styles from './Menu.module.css';

export type MenuItem = {
  key: string;
  label: string;
  /** menuitemradio にすると checked で選択中を示す */
  role?: 'menuitem' | 'menuitemradio';
  checked?: boolean;
  /** 選べないときに理由を添える。項目は選べない状態で表示する */
  disabledReason?: string;
  /** この項目の前に区切り線を引く */
  separatorBefore?: boolean;
  onSelect: () => void;
};

type Props = {
  /** ボタンの読み上げ名 */
  label: string;
  /** ボタンの中身（アイコン） */
  children: ReactNode;
  items: MenuItem[];
  /** 呼び出し側からボタンにフォーカスを戻すときに使う */
  buttonRef?: RefObject<HTMLButtonElement | null>;
};

/** WAI-ARIA の Menu Button パターン。上下の矢印・Home/End で移動、Enter/Space で選び、Escape と外側のクリックで閉じる */
export function Menu({ label, children, items, buttonRef: buttonRefProp }: Props) {
  const [open, setOpen] = useState(false);
  const ownButtonRef = useRef<HTMLButtonElement>(null);
  const buttonRef = buttonRefProp ?? ownButtonRef;
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  // 右に収まらないときは、ボタンの右端に揃えて開く
  const [alignEnd, setAlignEnd] = useState(false);
  const menuId = useId();

  function focusItem(index: number) {
    const count = items.length;
    itemRefs.current[(index + count) % count]?.focus();
  }

  // 開いたら、選択中の項目（無ければ最初の項目）にフォーカスする
  useEffect(() => {
    if (!open) return;
    const checked = items.findIndex((item) => item.checked);
    focusItem(checked === -1 ? 0 : checked);
    // 開いたときだけ動かす
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setAlignEnd(false);
      return;
    }
    const rect = menuRef.current?.getBoundingClientRect();
    if (rect && rect.right > document.documentElement.clientWidth) setAlignEnd(true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  function select(item: MenuItem) {
    if (item.disabledReason) return;
    close();
    item.onSelect();
  }

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.button}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {children}
      </button>

      {open && (
        <div
          id={menuId}
          ref={menuRef}
          role="menu"
          aria-label={label}
          className={alignEnd ? `${styles.menu} ${styles.alignEnd}` : styles.menu}
          onKeyDown={(e) => {
            const index = itemRefs.current.findIndex((el) => el === document.activeElement);
            const moves: Record<string, number> = {
              ArrowDown: index + 1,
              ArrowUp: index - 1,
              Home: 0,
              End: items.length - 1,
            };
            if (e.key in moves) {
              e.preventDefault();
              focusItem(moves[e.key]);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              close();
            } else if (e.key === 'Tab') {
              setOpen(false);
            }
          }}
        >
          {items.map((item, i) => {
            const role = item.role ?? 'menuitem';
            const noteId = `${menuId}-${item.key}-note`;
            return (
              <div key={item.key} role="none">
                {item.separatorBefore && <hr className={styles.separator} />}
                <button
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  type="button"
                  role={role}
                  tabIndex={-1}
                  className={styles.item}
                  aria-label={item.label}
                  aria-checked={role === 'menuitemradio' ? item.checked === true : undefined}
                  aria-disabled={item.disabledReason ? true : undefined}
                  aria-describedby={item.disabledReason ? noteId : undefined}
                  onClick={() => select(item)}
                >
                  {role === 'menuitemradio' && <span className={styles.check}>{item.checked && <CheckIcon />}</span>}
                  <span className={styles.label}>
                    {item.label}
                    {item.disabledReason && (
                      <span id={noteId} className={styles.note}>
                        {item.disabledReason}
                      </span>
                    )}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
