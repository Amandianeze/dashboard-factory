/** Chart panel (docs/lld/chart-panel.md). Dispatched by src/renderers/PanelRenderer.tsx. */
import type { Row } from '../../src/data/transforms';
import type { DatasetSpec, PanelSpec } from '../../src/spec/types';

/** Every panel spec that renders as a chart (every renderer except `kpi` and `table`). */
export type ChartPanelSpec = Exclude<PanelSpec, { renderer: 'kpi' | 'table' }>;

export interface ChartPanelProps {
  /** The validated panel; `renderer` picks the engine adapter (ADR-002). */
  panel: ChartPanelSpec;
  /** The panel's dataset declaration; Flint reads `semantics` from it. */
  dataset: DatasetSpec | undefined;
  /** The panel's rows after dashboard filters. */
  rows: Row[];
}
