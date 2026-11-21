/** Dashboard template (docs/lld/dashboard-template.md). src/dashboard/DashboardView.tsx imports this. */
import type { DashboardSpec } from '../../src/spec/types';

export interface DashboardTemplateProps {
  /** A validated dashboard spec: title band, filters, 12-column rows and panels. */
  spec: DashboardSpec;
}
