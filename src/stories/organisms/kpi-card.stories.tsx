import { expect } from 'storybook/test';
import preview from '../../../.storybook/preview';
import { KpiComparison } from '../../../docs/lld/kpi-value.props';
import { PanelFrame } from '../../components/panels/panel-frame';
import { KpiCard } from '../../renderers/KpiCard';
import type { KpiPanel } from '../../spec/types';
import { salesRows, sessionRow } from '../fixtures';

const revenue: KpiPanel = {
  title: 'Revenue',
  dataset: 'sales',
  kind: 'kpi-card',
  renderer: 'kpi',
  field: 'revenue',
  aggregate: 'sum',
  format: '$,.0f',
};

const meta = preview.meta({
  title: 'Organisms/KpiCard',
  component: KpiCard,
  args: { panel: revenue, rows: salesRows },
  decorators: [
    (Story, { args }) => (
      <PanelFrame id="kpi" title={args.panel.title} kind="kpi-card" span={4}>
        <Story />
      </PanelFrame>
    ),
  ],
});

export const Sum = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('region', { name: 'Revenue' })).toBeInTheDocument();
  },
});

/** Period comparison (kpi-value): one card instead of value / change / change % tiles. */
export const WithComparison = meta.story({
  args: {
    rows: [sessionRow],
    panel: {
      ...revenue,
      title: 'Close',
      field: 'close',
      aggregate: 'max',
      format: ',.2f',
      comparison: KpiComparison.parse({
        compareTo: { field: 'previous_close' },
        label: 'previous close',
      }),
    },
  },
});

/** Empty or filtered to nothing: a dash read as "no data". */
export const NoRows = meta.story({
  args: { rows: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('no data')).toBeInTheDocument();
  },
});

/** Count of zero rows is a real 0, not missing. */
export const CountOfNothing = meta.story({
  args: { rows: [], panel: { ...revenue, title: 'Orders', aggregate: 'count', format: ',.0f' } },
});

/** break-ui: 10⁹ revenue. */
export const Huge = meta.story({
  args: { rows: [{ revenue: 1_234_567_890 }] },
});
