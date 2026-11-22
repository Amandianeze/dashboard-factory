/** Filter bar (docs/lld/filter-bar.md). src/dashboard/FilterBar.tsx imports and re-exports this. */
import type { FilterState, Row } from '../../src/data/transforms';
import type { FilterSpec } from '../../src/spec/types';

export interface FilterBarProps {
  /** The dashboard's filters, in display order (data contract: FilterSpec). */
  filters: FilterSpec[];
  /** Unfiltered rows per dataset id; options are the distinct values of each filter's field. */
  data: Record<string, Row[]>;
  /** Selected values per filter id; an empty or missing list means "all". */
  state: FilterState;
  onChange: (next: FilterState) => void;
}
