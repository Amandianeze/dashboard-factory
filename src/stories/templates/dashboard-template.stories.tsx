import { expect, waitFor } from 'storybook/test';
import preview from '../../../.storybook/preview';
import { dashboards } from '../../dashboard/registry';
import { DashboardView } from '../../dashboard/DashboardView';
import type { DashboardSpec } from '../../spec/types';

/** Real pages: the specs in dashboards/, rendered from public/data fixtures. */
const spec = (id: string): DashboardSpec => {
  const entry = dashboards.find((d) => d.result.ok && d.result.spec.id === id)?.result;
  if (!entry?.ok) throw new Error(`dashboard ${id} is missing or invalid`);
  return entry.spec;
};

const meta = preview.meta({
  title: 'Templates/DashboardTemplate',
  component: DashboardView,
  parameters: { layout: 'fullscreen' },
});

export const RevenueOverview = meta.story({
  args: { spec: spec('revenue-overview') },
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getAllByRole('region').length).toBe(7), { timeout: 10_000 });
  },
});

export const Sp500Today = meta.story({
  args: { spec: spec('sp500-today') },
  play: async ({ canvas }) => {
    // Two deltas (points and %), each read "… versus previous close".
    await waitFor(
      () =>
        expect(canvas.getAllByText(/versus previous close/, { selector: '.sr-only' })).toHaveLength(
          2,
        ),
      { timeout: 10_000 },
    );
  },
});
