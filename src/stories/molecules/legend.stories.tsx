import { expect, waitFor } from 'storybook/test';
import preview from '../../../.storybook/preview';
import { PanelFrame } from '../../components/panels/panel-frame';
import { PanelRenderer } from '../../renderers/PanelRenderer';
import { PanelCell, salesDataset, salesRows } from '../fixtures';

/** Legends are drawn by the chart engine from the generated theme (no React component). */
const meta = preview.meta({
  title: 'Molecules/Legend',
  component: PanelFrame,
  decorators: [(Story) => <PanelCell>{Story()}</PanelCell>],
});

/** Symbol legend: above the plot, left-aligned, horizontal (Gate 2, decision 1). */
export const SymbolsOnTop = meta.story({
  render: () => (
    <PanelFrame id="legend-top" title="Revenue by region" kind="chart-panel" span={12}>
      <PanelRenderer
        dataset={salesDataset}
        rows={salesRows}
        panel={{
          title: 'Revenue by region',
          dataset: 'sales',
          kind: 'chart-panel',
          renderer: 'vega-lite',
          spec: {
            mark: 'line',
            encoding: {
              x: { field: 'date', type: 'temporal', title: null },
              y: { field: 'revenue', type: 'quantitative', aggregate: 'sum', title: 'Revenue' },
              color: { field: 'region', type: 'nominal', title: null },
            },
          },
        }}
      />
    </PanelFrame>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector('svg')).not.toBeNull(), {
      timeout: 10_000,
    });
  },
});

/** Gradient key: beside the plot for continuous colour (heatmaps). */
export const GradientBeside = meta.story({
  render: () => (
    <PanelFrame
      id="legend-gradient"
      title="Revenue by region and product"
      kind="chart-panel"
      span={12}
    >
      <PanelRenderer
        dataset={salesDataset}
        rows={salesRows}
        panel={{
          title: 'Revenue by region and product',
          dataset: 'sales',
          kind: 'chart-panel',
          renderer: 'flint',
          chart: {
            chartType: 'Heatmap',
            encodings: {
              x: 'product',
              y: 'region',
              color: { field: 'revenue', aggregate: 'sum', bins: 0 },
            },
          },
        }}
      />
    </PanelFrame>
  ),
});
