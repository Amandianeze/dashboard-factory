/** Filter chip (docs/lld/filter-chip.md): a toggle button for one filter value. */
import type { FilterChipProps } from '../../../docs/lld/filter-chip.props';

export type { FilterChipProps };

export function FilterChip({ label, pressed, onPressedChange, disabled }: FilterChipProps) {
  return (
    <button
      type="button"
      className="chip"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={() => onPressedChange(!pressed)}
    >
      {label}
    </button>
  );
}
