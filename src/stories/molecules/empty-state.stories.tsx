import { expect } from 'storybook/test';
import preview from '../../../.storybook/preview';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/ui/empty-state';
import { PanelCell } from '../fixtures';

const meta = preview.meta({
  title: 'Molecules/EmptyState',
  component: EmptyState,
  args: { variant: 'empty', title: 'No data yet' },
  decorators: [(Story) => <PanelCell>{Story()}</PanelCell>],
});

export const Empty = meta.story({
  args: { variant: 'empty', title: 'No data yet' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status')).toHaveTextContent('No data yet');
  },
});
export const Filtered = meta.story({
  args: {
    variant: 'filtered',
    title: 'Nothing matches these filters',
    description: 'Try fewer regions or a wider date range.',
    action: (
      <Button variant="secondary" size="sm">
        Clear filters
      </Button>
    ),
  },
});
export const Error = meta.story({
  args: {
    variant: 'error',
    title: 'The data didn’t load',
    description: 'GET /data/sales_daily.json returned 404.',
    action: <Button size="sm">Retry</Button>,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('alert')).toHaveTextContent('The data didn’t load');
  },
});
export const Compact = meta.story({
  args: { variant: 'empty', size: 'compact', title: 'No orders today' },
});
