/**
 * Ranked bars (docs/lld/ranked-bars.md). The Zod schema stays in src/components/d3/charts.ts,
 * because Node validation imports it without React; this re-exports the inferred type.
 */
export type { RankedBarsProps } from '../../src/components/d3/charts';
export type { D3ChartProps } from '../../src/components/d3/registry';
