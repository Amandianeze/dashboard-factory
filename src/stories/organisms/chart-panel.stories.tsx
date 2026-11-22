import { expect, userEvent, waitFor, within } from 'storybook/test';
import preview from '../../../.storybook/preview';
import type { ChartPanelSpec } from '../../../docs/lld/chart-panel.props';
import { ChartPanel } from '../../components/panels/chart-panel';
import { EmptyState } from '../../components/ui/empty-state';
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
      <ChartPanel
        id={panel.renderer}
        span={12}
        panel={panel}
        dataset={salesDataset}
        rows={salesRows}
      />
    </PanelCell>
  );
}

const meta = preview.meta({ title: 'Organisms/ChartPanel', component: Chart });

/** Drawn, and described: the image's accessible description is the generated summary. */
const drawn = async ({ canvasElement }: { canvasElement: HTMLElement }) =>
  waitFor(
    () => {
      expect(canvasElement.querySelector('svg')).not.toBeNull();
      expect(
        canvasElement.querySelector('[role="img"][aria-describedby]'),
      ).toHaveAccessibleDescription(/data points/);
    },
    { timeout: 15_000 },
  );

/** Keyboard only: open the table, count what was plotted, sort it, scroll it, go back. */
const tableView = (plotted: number) =>
  async function play({ canvasElement }: { canvasElement: HTMLElement }) {
    await drawn({ canvasElement });
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole('button', { name: /^Table view of/ });
    toggle.focus();
    await userEvent.keyboard('{Enter}');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(toggle).toHaveFocus();
    const table = canvas.getByRole('table');
    await expect(table.querySelectorAll('tbody tr')).toHaveLength(Math.min(plotted, 50));
    if (plotted > 50) await expect(canvas.getByRole('button', { name: /^Show all/ })).toBeVisible();
    await expect(canvas.queryByRole('img', { hidden: false })).toBeNull();

    const region = canvas.getByRole('region', { name: / table$/ });
    await userEvent.tab();
    await expect(region).toHaveFocus();
    if (region.scrollHeight > region.clientHeight + 20) {
      region.scrollTop = region.scrollHeight;
      const header = table.querySelector('th')!.getBoundingClientRect();
      await expect(Math.abs(header.top - region.getBoundingClientRect().top)).toBeLessThan(2);
    }
  };

export const VegaLite = meta.story({ args: { panel: panels.vegaLite! }, play: drawn });
export const Flint = meta.story({ args: { panel: panels.flint! }, play: drawn });
export const VegaLiteTable = meta.story({ args: { panel: panels.vegaLite! }, play: tableView(32) });
export const FlintTable = meta.story({ args: { panel: panels.flint! }, play: tableView(16) });
export const D3Table = meta.story({ args: { panel: panels.d3! }, play: tableView(4) });
export const PlotlyTable = meta.story({ args: { panel: panels.plotly! }, play: tableView(128) });
export const D3 = meta.story({ args: { panel: panels.d3! }, play: drawn });
export const Plotly = meta.story({ args: { panel: panels.plotly! }, play: drawn });

/** Filtered to nothing: an empty state with a way out, never empty axes. */
export const Filtered = meta.story({
  args: { panel: panels.vegaLite! },
  render: ({ panel }) => (
    <PanelCell>
      <ChartPanel
        id="filtered"
        span={12}
        panel={panel}
        dataset={salesDataset}
        rows={[]}
        empty={<EmptyState variant="filtered" title="Nothing matches these filters" />}
      />
    </PanelCell>
  ),
});
