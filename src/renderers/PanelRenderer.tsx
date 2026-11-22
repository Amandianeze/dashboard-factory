import { Component, type ReactNode } from 'react';
import type { OnChartData } from '../data/chartData';
import type { Row } from '../data/transforms';
import type { DatasetSpec, PanelSpec } from '../spec/types';
import { DataTable } from '../components/panels/data-table';
import { EmptyState } from '../components/ui/empty-state';
import { D3Chart } from './D3Chart';
import { FlintChart } from './FlintChart';
import { KpiCard } from './KpiCard';
import { PlotlyChart } from './PlotlyChart';
import { VegaLiteChart } from './VegaLiteChart';

/** The one place that maps `renderer` → component. Add new renderers here and in schema.ts. */
export function PanelRenderer({
  panel,
  dataset,
  rows,
  onData,
}: {
  panel: PanelSpec;
  dataset: DatasetSpec | undefined;
  rows: Row[];
  /** Charts report the rows they drew (chart-panel's table view and summary). */
  onData?: OnChartData;
}) {
  switch (panel.renderer) {
    case 'kpi':
      return <KpiCard panel={panel} rows={rows} />;
    case 'vega-lite':
      return <VegaLiteChart panel={panel} rows={rows} onData={onData} />;
    case 'd3':
      return <D3Chart panel={panel} rows={rows} onData={onData} />;
    case 'plotly':
      return <PlotlyChart panel={panel} rows={rows} onData={onData} />;
    case 'flint':
      return (
        <FlintChart panel={panel} rows={rows} semantics={dataset?.semantics} onData={onData} />
      );
    case 'table':
      return (
        <DataTable
          columns={panel.columns}
          rows={rows}
          caption={panel.title}
          sort={panel.sort}
          limit={panel.limit}
        />
      );
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
        <EmptyState
          variant="error"
          title="This panel failed to render"
          description={this.state.error.message}
        />
      );
    return this.props.children;
  }
}
