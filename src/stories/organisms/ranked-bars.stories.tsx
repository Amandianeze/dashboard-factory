import { expect, waitFor } from 'storybook/test';
import preview from '../../../.storybook/preview';
import type { RankedBarsProps } from '../../../docs/lld/ranked-bars.props';
import { PanelFrame } from '../../components/panels/panel-frame';
import type { Row } from '../../data/transforms';
import { D3Chart } from '../../renderers/D3Chart';
import { NarrowCell, PanelCell, salesRows } from '../fixtures';

/** Rendered through the D3 adapter, which measures its cell like the app does. */
function RankedBarsPanel({ props, rows }: { props: RankedBarsProps; rows: Row[] }) {
  return (
    <PanelFrame id="ranked" title="Ranked bars" kind="chart-panel" span={12}>
      <D3Chart
        rows={rows}
        panel={{
          title: 'Ranked bars',
          dataset: 'sales',
          kind: 'chart-panel',
          renderer: 'd3',
          component: 'RankedBars',
          props,
        }}
      />
    </PanelFrame>
  );
}

const byProduct: RankedBarsProps = {
  category: 'product',
  value: 'revenue',
  aggregate: 'sum',
  limit: 10,
  valueFormat: '$.3~s',
};

const meta = preview.meta({
  title: 'Organisms/RankedBars',
  component: RankedBarsPanel,
  args: { props: byProduct, rows: salesRows },
  decorators: [(Story) => <PanelCell>{Story()}</PanelCell>],
});

export const ByProduct = meta.story({
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll('svg rect').length).toBe(4));
  },
});

export const ByRegionCount = meta.story({
  args: {
    props: {
      category: 'region',
      value: 'orders',
      aggregate: 'count',
      limit: 10,
      valueFormat: ',.0f',
    },
  },
});

export const NoValues = meta.story({ args: { rows: [] } });

/** break-ui: long labels in a narrow cell clip at chart.ranked-bars.label-width (LLD open question). */
export const LongLabels = meta.story({
  args: {
    rows: salesRows.map((r) => ({ ...r, product: `${String(r.product)} Industrial Supply Co.` })),
  },
  decorators: [(Story) => <NarrowCell>{Story()}</NarrowCell>],
});
