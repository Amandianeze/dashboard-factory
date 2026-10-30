import { Component, type ReactNode } from 'react';
import type { Row } from '../data/transforms';
import type { PanelSpec } from '../spec/types';
import { D3Chart } from './D3Chart';
import { KpiCard } from './KpiCard';
import { PlotlyChart } from './PlotlyChart';
import { VegaLiteChart } from './VegaLiteChart';

/** The one place that maps `renderer` → component. Add new renderers here and in schema.ts. */
export function PanelRenderer({ panel, rows }: { panel: PanelSpec; rows: Row[] }) {
  switch (panel.renderer) {
    case 'kpi':
      return <KpiCard panel={panel} rows={rows} />;
    case 'vega-lite':
      return <VegaLiteChart panel={panel} rows={rows} />;
    case 'd3':
      return <D3Chart panel={panel} rows={rows} />;
    case 'plotly':
      return <PlotlyChart panel={panel} rows={rows} />;
  }
}

/** Isolates failures so one broken panel never takes down the dashboard. */
export class PanelErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error)
      return (
        <p className="panel-error" role="alert">
          Panel failed to render: {this.state.error.message}
        </p>
      );
    return this.props.children;
  }
}
