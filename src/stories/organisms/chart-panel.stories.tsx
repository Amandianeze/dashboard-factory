import { expect, waitFor } from 'storybook/test';
import preview from '../../../.storybook/preview';
import type { ChartPanelSpec } from '../../../docs/lld/chart-panel.props';
import { PanelFrame } from '../../components/panels/panel-frame';
import { EmptyState } from '../../components/ui/empty-state';
import { PanelRenderer } from '../../renderers/PanelRenderer';
import { PanelCell, salesDataset, salesRows } from '../fixtures';

const base = { dataset: 'sales', kind: 'chart-panel' } as const;

/** The same sales data through each engine ADR-002 allows. */
const panels: Record<string, ChartPanelSpec> = {
  vegaLite: {
    ...base,
    title: 'Weekly revenue by region',
    renderer: 'vega-lite',
    spec: {
      mark: { type: 'line', point: true },
      encoding: {
        x: { field: 'date', type: 'temporal', title: null },
        y: { field: 'revenue', type: 'quantitative', aggregate: 'sum', title: 'Revenue' },
        color: { field: 'region', type: 'nominal', title: null },
      },
    },
  },
  flint: {
    ...base,
    title: 'Revenue by region and product',
    renderer: 'flint',
    chart: {
      chartType: 'Heatmap',
      encodings: {
        x: 'product',
        y: 'region',
        color: { field: 'revenue', aggregate: 'sum', bins: 0 },
      },
    },
  },
  d3: {
    ...base,
    title: 'Revenue by product',
    renderer: 'd3',
    component: 'RankedBars',
    props: {
      category: 'product',
      value: 'revenue',
      aggregate: 'sum',
      limit: 10,
      valueFormat: '$.3~s',
    },
  },
  plotly: {
    ...base,
    title: 'Orders vs revenue',
    renderer: 'plotly',
    trace: { type: 'scatter', x: 'orders', y: 'revenue', groupBy: 'region', mode: 'markers' },
    layout: {},
  },
};

function Chart({ panel }: { panel: ChartPanelSpec }) {
  return (
    <PanelCell>
      <PanelFrame id={panel.renderer} title={panel.title} kind="chart-panel" span={12}>
        <PanelRenderer panel={panel} dataset={salesDataset} rows={salesRows} />
      </PanelFrame>
    </PanelCell>
  );
}

const meta = preview.meta({ title: 'Organisms/ChartPanel', component: Chart });

const drawn = async ({ canvasElement }: { canvasElement: HTMLElement }) =>
  waitFor(() => expect(canvasElement.querySelector('svg')).not.toBeNull(), { timeout: 15_000 });

export const VegaLite = meta.story({ args: { panel: panels.vegaLite! }, play: drawn });
export const Flint = meta.story({ args: { panel: panels.flint! }, play: drawn });
export const D3 = meta.story({ args: { panel: panels.d3! }, play: drawn });
export const Plotly = meta.story({ args: { panel: panels.plotly! }, play: drawn });

/** Filtered to nothing: an empty state with a way out, never empty axes. */
export const Filtered = meta.story({
  args: { panel: panels.vegaLite! },
  render: ({ panel }) => (
    <PanelCell>
      <PanelFrame id="filtered" title={panel.title} kind="chart-panel" span={12}>
        <EmptyState variant="filtered" title="Nothing matches these filters" />
      </PanelFrame>
    </PanelCell>
  ),
});
