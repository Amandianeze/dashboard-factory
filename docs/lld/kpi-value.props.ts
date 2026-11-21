/** KPI value with delta (docs/lld/kpi-value.md). Proposed: the period-comparison pattern. */
import { z } from 'zod';
import { D3FormatString } from '../../src/spec/d3Format';

/**
 * The spec addition a KPI panel gets (data contract). `compareTo` names how the previous value is
 * found; the delta and delta % are derived, never declared as separate panels.
 */
export const KpiComparison = z
  .object({
    /** Field holding the comparison value (e.g. previous_close), or a period offset later. */
    compareTo: z.object({ field: z.string().min(1) }).strict(),
    show: z
      .array(z.enum(['delta', 'delta-pct']))
      .min(1)
      .default(['delta', 'delta-pct']),
    deltaFormat: D3FormatString.default('+,.2f'),
    polarity: z.enum(['up-is-good', 'down-is-good', 'neutral']).default('up-is-good'),
  })
  .strict();
export type KpiComparison = z.infer<typeof KpiComparison>;

export interface KpiValueProps {
  current: number | null;
  previous: number | null;
  format: string;
  comparison: KpiComparison;
}
