import { expect, userEvent, waitFor, within } from 'storybook/test';
import preview from '../../../.storybook/preview';
import { Button } from '../../components/ui/button';
import { Tooltip } from '../../components/ui/tooltip';

const meta = preview.meta({
  title: 'Atoms/Tooltip',
  component: Tooltip,
  args: {
    content: 'Revenue after refunds, in US dollars.',
    children: (
      <Button variant="ghost" size="sm" aria-label="About revenue">
        ⓘ
      </Button>
    ),
  },
});

export const Default = meta.story({});

/** Opens on keyboard focus (not hover only) and closes on Escape (WCAG 1.4.13). */
export const KeyboardFocus = meta.story({
  play: async ({ canvas, canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'About revenue' })).toHaveFocus();
    await waitFor(() =>
      expect(page.getByText('Revenue after refunds, in US dollars.')).toBeVisible(),
    );
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(page.queryByText('Revenue after refunds, in US dollars.')).not.toBeInTheDocument(),
    );
  },
});

/** break-ui: a long description wraps inside tooltip.max-width. */
export const LongContent = meta.story({
  args: {
    content:
      'Revenue is recognised on shipment, net of refunds and discounts, converted to US dollars at the daily reference rate of the order date.',
  },
});
