/** Chart panel (docs/lld/chart-panel.md). Built in src/components/panels/chart-panel.tsx. */
import type { ReactNode } from 'react';
import type { Row } from '../../src/data/transforms';
import type { DatasetSpec, PanelSpec } from '../../src/spec/types';

/** Every panel spec that renders as a chart (every renderer except `kpi` and `table`). */
export type ChartPanelSpec = Exclude<PanelSpec, { renderer: 'kpi' | 'table' }>;

export interface ChartPanelProps {
  /** Panel id; names the heading, which also names the chart image. */
  id: string;
  /** Columns out of 12 in the dashboard row. */
  span: number;
  /** The validated panel; `renderer` picks the engine adapter (ADR-002). */
  panel: ChartPanelSpec;
  /** The panel's dataset declaration; Flint reads `semantics` from it. */
  dataset: DatasetSpec | undefined;
  /** The panel's rows after dashboard filters. */
  rows: Row[];
  /** Shown in place of the chart when `rows` is empty; default: EmptyState `empty`. */
  empty?: ReactNode;
}
