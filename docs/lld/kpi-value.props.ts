/** KPI value with delta (docs/lld/kpi-value.md): the period-comparison pattern. */
import { z } from 'zod';
import { D3FormatString } from '../../src/spec/d3Format';

/**
 * `comparison` on a KPI panel (data contract). The previous value is the same aggregate over
 * `compareTo.field`; delta and delta % are derived, never declared as separate panels.
 * Field-based only: period offsets wait for the semantic layer (Gate 4, decision 2).
 */
export const KpiComparison = z
  .object({
    compareTo: z.object({ field: z.string().min(1) }).strict(),
    /** Names the comparison in the caption and for screen readers: "vs previous close". */
    label: z.string().min(1).default('previous'),
    show: z.array(z.enum(['delta', 'delta-pct'])).min(1).default(['delta', 'delta-pct']),
    deltaFormat: D3FormatString.default('+,.2f'),
    deltaPctFormat: D3FormatString.default('+.2%'),
    polarity: z.enum(['up-is-good', 'down-is-good', 'neutral']).default('up-is-good'),
  })
  .strict();
export type KpiComparison = z.infer<typeof KpiComparison>;

export interface KpiValueProps {
  current: number | null;
  previous: number | null;
  /** d3-format for the current and previous values. */
  format: string;
  comparison: KpiComparison;
}
