/** Filter chip (docs/lld/filter-chip.md). Today inlined in FilterBar; extraction target. */
export interface FilterChipProps {
  /** The filter value, shown as the chip text and used as its accessible name. */
  label: string;
  /** Selected state, exposed as aria-pressed. */
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  disabled?: boolean;
}
