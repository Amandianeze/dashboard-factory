/** Select (docs/lld/select.md). Native <select>, today inlined in FilterBar; extraction target. */
export interface SelectProps {
  /** Visible label text; the select is wrapped in its <label>. */
  label: string;
  options: string[];
  /** Selected value; null means the "all" option. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** Text of the empty option. Default "All". */
  allLabel?: string;
  disabled?: boolean;
}
