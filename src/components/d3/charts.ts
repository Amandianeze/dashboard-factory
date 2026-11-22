/**
 * D3 chart registry — the contract between specs and bespoke D3 components.
 *
 * Pure data (no React) so Node validation scripts can import it. Each entry declares:
 *   - propsSchema: what a spec's `props` must look like
 *   - fieldProps:  which props name dataset fields (checked against the dataset declaration)
 *   - chartData:   the rows the chart draws, for its table view and summary (required)
 * The React implementation lives in registry.tsx under the same key.
 */
import { z } from 'zod';
import { exactFormat, type ChartData } from '../../data/chartData';
import { groupAggregate, type Row } from '../../data/transforms';
import { D3FormatString } from '../../spec/d3Format';

export interface CatalogEntry<S extends z.ZodTypeAny = z.ZodTypeAny> {
  description: string;
  propsSchema: S;
  fieldProps: string[];
  /** The chart's text alternative: exactly the rows it draws, computed by the same function. */
  chartData(rows: Row[], props: z.infer<S>): ChartData;
}

const define = <S extends z.ZodTypeAny>(e: CatalogEntry<S>) => e;

export const RankedBarsProps = z
  .object({
    category: z.string(),
    value: z.string(),
    aggregate: z.enum(['sum', 'mean', 'count']).default('sum'),
    limit: z.number().int().min(1).max(50).default(10),
    valueFormat: D3FormatString.default(',.0f'),
  })
  .strict();
export type RankedBarsProps = z.infer<typeof RankedBarsProps>;

/** The bars, in drawing order: aggregated, non-finite dropped, largest first, top `limit`. */
export function rankRows(rows: Row[], props: RankedBarsProps): { key: string; value: number }[] {
  const { category, value, aggregate, limit } = props;
  return groupAggregate(rows, [category], value, aggregate)
    .map((r) => ({ key: String(r[category]), value: Number(r[value]) }))
    .filter((r) => Number.isFinite(r.value))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export const d3Charts = {
  RankedBars: define({
    description:
      'Horizontal bars ranking categories by an aggregated value, largest first. Use for top-N comparisons.',
    propsSchema: RankedBarsProps,
    fieldProps: ['category', 'value'],
    chartData: (rows, props) => ({
      from: 'plotted',
      columns: [
        { field: 'key', label: props.category, measure: false },
        {
          field: 'value',
          label: props.aggregate === 'count' ? 'Count' : `${props.aggregate} of ${props.value}`,
          measure: true,
          format: exactFormat(props.valueFormat),
        },
      ],
      rows: rankRows(rows, props),
    }),
  }),
} satisfies Record<string, CatalogEntry>;

export type D3ChartName = keyof typeof d3Charts;
export const isD3ChartName = (name: string): name is D3ChartName => name in d3Charts;
