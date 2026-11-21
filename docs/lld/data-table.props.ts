/** Data table (docs/lld/data-table.md). Proposed: the `table` renderer and the chart fallback. */
import { z } from 'zod';
import { D3FormatString } from '../../src/spec/d3Format';
import type { Row } from '../../src/data/transforms';

export const TableColumn = z
  .object({
    field: z.string().min(1),
    label: z.string().optional(),
    /** Numbers right-align and use tabular numerals automatically; this overrides. */
    align: z.enum(['start', 'end']).optional(),
    format: D3FormatString.optional(),
    /** Conditional format: a sequential or diverging token ramp, or a ±sign colour. */
    conditional: z.enum(['sequential', 'diverging', 'sign']).optional(),
  })
  .strict();

/** The proposed panel spec (data contract). Joins PanelSpec with kind: data-table when built. */
export const TablePanel = z
  .object({
    renderer: z.literal('table'),
    columns: z.array(TableColumn).min(1),
    sort: z
      .object({ field: z.string(), order: z.enum(['asc', 'desc']) })
      .strict()
      .optional(),
    /** Rows shown before "Show all"; virtualised beyond 500. */
    limit: z.number().int().min(1).max(10_000).default(50),
  })
  .strict();
export type TablePanel = z.infer<typeof TablePanel>;

export interface DataTableProps {
  columns: z.infer<typeof TableColumn>[];
  rows: Row[];
  /** Visible caption (the panel title) — tables are named by <caption>. */
  caption: string;
  sort?: TablePanel['sort'];
  onSortChange?: (sort: NonNullable<TablePanel['sort']>) => void;
  limit?: number;
}
