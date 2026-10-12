import { STATUSES, STATUS_LABELS, type Status, isStatus } from '../backlog/model';
import styles from './StatusSelect.module.css';

type Props = {
  value: Status;
  onChange: (status: Status) => void;
  label: string;
  id?: string;
};

export function StatusSelect({ value, onChange, label, id }: Props) {
  return (
    <select
      id={id}
      className={`${styles.select} ${styles[value]}`}
      value={value}
      aria-label={label}
      onChange={(e) => {
        if (isStatus(e.target.value)) onChange(e.target.value);
      }}
    >
      {STATUSES.map((status) => (
        <option key={status} value={status}>
          {STATUS_LABELS[status]}
        </option>
      ))}
    </select>
  );
}
