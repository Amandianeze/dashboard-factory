/** Data table (docs/lld/data-table.md): the `table` renderer, later also the chart fallback. */
import { z } from 'zod';
import type { Row } from '../../src/data/transforms';
import { D3FormatString } from '../../src/spec/d3Format';
import { BADGE_TONES } from './badge.props';

export const TableColumn = z
  .object({
    field: z.string().min(1),
    /** Header text; defaults to the field name. */
    label: z.string().optional(),
    /** Numbers align to the end automatically; this overrides. */
    align: z.enum(['start', 'end']).optional(),
    /** d3-format for numbers; omit for text. */
    format: D3FormatString.optional(),
    /**
     * Conditional format. `sign`: positive and negative numbers take the delta colours (values
     * stay printed, so colour is never the only signal). Ramps (sequential, diverging) need
     * per-cell text contrast and come later.
     */
    conditional: z.enum(['sign']).optional(),
    /** Show values as Badges: value → tone. Unlisted values are neutral. */
    badges: z.record(z.enum(BADGE_TONES)).optional(),
  })
  .strict();
export type TableColumn = z.infer<typeof TableColumn>;

/** Table-specific panel fields (data contract); schema.ts adds title, kind and dataset. */
export const TablePanel = z
  .object({
    renderer: z.literal('table'),
    columns: z.array(TableColumn).min(1),
    sort: z
      .object({ field: z.string().min(1), order: z.enum(['asc', 'desc']) })
      .strict()
      .optional(),
    /** Rows shown before "Show all". */
    limit: z.number().int().min(1).max(10_000).default(50),
  })
  .strict();
export type TablePanel = z.infer<typeof TablePanel>;
export type TableSort = NonNullable<TablePanel['sort']>;

export interface DataTableProps {
  columns: TableColumn[];
  rows: Row[];
  /** Names the table (<caption>); the panel title. */
  caption: string;
  /** Initial sort; header buttons change it. */
  sort?: TableSort;
  limit?: number;
}
