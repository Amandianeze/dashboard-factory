/** Empty state (docs/lld/empty-state.md). Proposed: one component for no-data, filtered-out and error. */
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  /** empty: no data at all · filtered: filters exclude everything · error: it failed. */
  variant: 'empty' | 'filtered' | 'error';
  /** Short, specific: "No orders in this range", not "No data". */
  title: string;
  description?: string;
  /** One recovery action (a Button), e.g. "Clear filters" or "Retry". */
  action?: ReactNode;
  /** `compact` for KPI-sized panels: text only, no icon. Default `regular`. */
  size?: 'regular' | 'compact';
}
