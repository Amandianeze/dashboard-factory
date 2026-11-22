/**
 * Panel frame (docs/lld/panel-frame.md). Today inlined in DashboardView; this is the interface it
 * is extracted to (Gate 3 deprecations 3, 5 and 7).
 */
import type { ReactNode } from 'react';
import type { PanelKind } from '../../src/spec/generated/panel-kinds';

export interface PanelFrameProps {
  /** Panel id; names the heading id and the test id. */
  id: string;
  /** Visible heading (h2). */
  title: string;
  /** Shown in a Tooltip on an info trigger, never only in `title=`. */
  description?: string;
  /** The catalog organism inside; set as `data-kind`. */
  kind: PanelKind;
  /** Columns out of 12 in the dashboard row. */
  span: number;
  /** Controls at the end of the header, e.g. the chart panel's Table toggle. */
  actions?: ReactNode;
  /** The panel body; wrapped in an error boundary that renders EmptyState `error`. */
  children: ReactNode;
}
