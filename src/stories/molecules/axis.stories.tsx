import { expect, waitFor } from 'storybook/test';
import preview from '../../../.storybook/preview';
import { PanelFrame } from '../../components/panels/panel-frame';
import { PanelRenderer } from '../../renderers/PanelRenderer';
import { PanelCell, salesDataset, salesRows } from '../fixtures';

/** Axes are drawn by the chart engine; one treatment across Vega-Lite, Flint and Plotly. */
const meta = preview.meta({
  title: 'Molecules/Axis',
  component: PanelFrame,
  decorators: [(Story) => <PanelCell>{Story()}</PanelCell>],
});

/** Gridlines on the value axis only; no axis title that repeats the panel title. */
export const VegaLite = meta.story({
  render: () => (
    <PanelFrame id="axis-vl" title="Orders by product" kind="chart-panel" span={12}>
      <PanelRenderer
        dataset={salesDataset}
        rows={salesRows}
        panel={{
          title: 'Orders by product',
          dataset: 'sales',
          kind: 'chart-panel',
          renderer: 'vega-lite',
          spec: {
            mark: 'bar',
            encoding: {
              x: { field: 'product', type: 'nominal', title: null },
              y: { field: 'orders', type: 'quantitative', aggregate: 'sum', title: 'Orders' },
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

/** The same axis styling from the Plotly theme (formatted ticks, lowercase titles fixed). */
export const Plotly = meta.story({
  render: () => (
    <PanelFrame id="axis-plotly" title="Orders vs revenue" kind="chart-panel" span={12}>
      <PanelRenderer
        dataset={salesDataset}
        rows={salesRows}
        panel={{
          title: 'Orders vs revenue',
          dataset: 'sales',
          kind: 'chart-panel',
          renderer: 'plotly',
          trace: { type: 'scatter', x: 'orders', y: 'revenue', mode: 'markers' },
          layout: {},
        }}
      />
    </PanelFrame>
  ),
});
