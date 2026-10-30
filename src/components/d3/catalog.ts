/**
 * D3 chart catalog — the contract between specs and bespoke D3 components.
 *
 * Pure data (no React) so Node validation scripts can import it. Each entry declares:
 *   - propsSchema: what a spec's `props` must look like
 *   - fieldProps:  which props name dataset fields (checked against the dataset declaration)
 * The React implementation lives in registry.tsx under the same key.
 */
import { z } from 'zod';
import { D3FormatString } from '../../spec/d3Format';

export interface CatalogEntry<S extends z.ZodTypeAny = z.ZodTypeAny> {
  description: string;
  propsSchema: S;
  fieldProps: string[];
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

export const d3Catalog = {
  RankedBars: define({
    description:
      'Horizontal bars ranking categories by an aggregated value, largest first. Use for top-N comparisons.',
    propsSchema: RankedBarsProps,
    fieldProps: ['category', 'value'],
  }),
} satisfies Record<string, CatalogEntry>;

export type D3ChartName = keyof typeof d3Catalog;
export const isD3ChartName = (name: string): name is D3ChartName => name in d3Catalog;
