/** Dashboard template (docs/lld/dashboard-template.md). src/dashboard/DashboardView.tsx imports this. */
import type { ReactNode } from 'react';
import type { DashboardSpec } from '../../src/spec/types';

export interface DashboardTemplateProps {
  /** A validated dashboard spec: title band, filters, 12-column rows and panels. */
  spec: DashboardSpec;
  /** Page-level controls from the app shell (the theme picker), shown in the title band. */
  actions?: ReactNode;
}
