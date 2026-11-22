/** KPI card (docs/lld/kpi-card.md). src/renderers/KpiCard.tsx imports and re-exports this. */
import type { Row } from '../../src/data/transforms';
import type { KpiPanel } from '../../src/spec/types';

export interface KpiCardProps {
  /** The validated panel: `field`, `aggregate`, `format` (data contract: KpiPanel). */
  panel: KpiPanel;
  /** The panel's rows after dashboard filters. */
  rows: Row[];
}
