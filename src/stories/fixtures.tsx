/**
 * Shared story data and wrappers. Data is deterministic (no Math.random) so visual tests are
 * stable. Sizes come from tokens: stories never pass raw lengths.
 */
import type { ReactNode } from 'react';
import type { Row } from '../data/transforms';
import type { DatasetSpec } from '../spec/types';

export const REGIONS = ['North', 'South', 'East', 'West'];
export const PRODUCTS = ['Atlas', 'Beacon', 'Cobalt', 'Drift'];

/** 8 weeks × 4 regions × 4 products, with a repeatable pattern. */
export const salesRows: Row[] = Array.from({ length: 8 }, (_, w) => w).flatMap((w) =>
  REGIONS.flatMap((region, r) =>
    PRODUCTS.map((product, p) => {
      const orders = 20 + ((w * 7 + r * 5 + p * 3) % 17);
      return {
        date: `2026-0${1 + Math.floor(w / 4)}-${String(1 + (w % 4) * 7).padStart(2, '0')}`,
        region,
        product,
        orders,
        revenue: orders * (80 + p * 35 + r * 10),
      };
    }),
  ),
);

export const salesDataset: DatasetSpec = {
  source: 'fixture',
  path: 'sales_daily.json',
  fields: {
    date: 'temporal',
    region: 'nominal',
    product: 'nominal',
    orders: 'quantitative',
    revenue: 'quantitative',
  },
  semantics: { revenue: { semanticType: 'Amount', unit: 'USD' } },
};

/** One-row session summary for KPI comparisons. */
export const sessionRow: Row = {
  close: 7720.39,
  previous_close: 7743.98,
  high: 7761.2,
  low: 7698.4,
};

/** Orders with a status, for tables and badges (the Gate 2 gap). */
export const orderRows: Row[] = Array.from({ length: 64 }, (_, i) => ({
  order: `#${1001 + i}`,
  customer: ['Northwind', 'Contoso', 'Fabrikam', 'Tailspin', 'Wide World Importers'][i % 5],
  status: ['Shipped', 'Pending', 'Delayed', 'Cancelled'][(i * 7) % 4],
  revenue: 120 + ((i * 97) % 2400) + (i % 3) * 0.5,
  change: ((i * 37) % 21) - 10,
}));

/** A 10,000-row table for break-ui stories. */
export const manyOrderRows: Row[] = Array.from({ length: 10_000 }, (_, i) => ({
  ...orderRows[i % orderRows.length],
  order: `#${100001 + i}`,
}));

/** A panel-sized cell (layout.panel.stacked-min-height) for organisms that fill their parent. */
export function PanelCell({ children }: { children: ReactNode }) {
  return <div className="grid h-(--layout-panel-stacked-min-height)">{children}</div>;
}

/** A narrow cell (layout.card.min-width) for overflow stories. */
export function NarrowCell({ children }: { children: ReactNode }) {
  return <div className="grid w-(--layout-card-min-width)">{children}</div>;
}
