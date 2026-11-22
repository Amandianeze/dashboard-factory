/** Select (docs/lld/select.md). Native on purpose (ADR-003 decision 3), inside its own label. */
import type { SelectProps } from '../../../docs/lld/select.props';

export type { SelectProps };

export function Select({
  label,
  options,
  value,
  onChange,
  allLabel = 'All',
  disabled,
}: SelectProps) {
  return (
    <label className="filter">
      <span>{label}</span>
      <select
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value ? e.target.value : null)}
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
