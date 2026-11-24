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
    const trigger = canvas.getByRole('button', { name: 'About revenue' });
    await expect(trigger).toHaveFocus();
    await waitFor(() =>
      expect(page.getByText('Revenue after refunds, in US dollars.')).toBeVisible(),
    );
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(page.getByText('Revenue after refunds, in US dollars.')).not.toBeVisible(),
    );
  },
});

/** Screen readers get the content as the trigger's description, whether or not it is showing. */
export const DescribesTrigger = meta.story({
  play: async ({ canvas, canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole('button', { name: 'About revenue' });
    await expect(trigger).toHaveAccessibleDescription('Revenue after refunds, in US dollars.');
    await userEvent.hover(trigger);
    await waitFor(() => expect(page.getByRole('tooltip')).toBeVisible());
    await expect(trigger).toHaveAccessibleDescription('Revenue after refunds, in US dollars.');
  },
});

/** break-ui: a long description wraps inside tooltip.max-width. */
export const LongContent = meta.story({
  args: {
    content:
      'Revenue is recognised on shipment, net of refunds and discounts, converted to US dollars at the daily reference rate of the order date.',
  },
});

/** In a TooltipGroup, once one tooltip has opened its neighbour opens at once, without the fade. */
export const AdjacentOpensInstantly = meta.story({
  render: () => (
    <div className="flex gap-(--space-inline-sm)">
      <Tooltip content="Revenue after refunds.">
        <Button variant="ghost" size="sm" aria-label="About revenue">
          ⓘ
        </Button>
      </Tooltip>
      <Tooltip content="Orders shipped.">
        <Button variant="ghost" size="sm" aria-label="About orders">
          ⓘ
        </Button>
      </Tooltip>
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.hover(canvas.getByRole('button', { name: 'About revenue' }));
    await waitFor(() => expect(page.getByText('Revenue after refunds.')).toBeVisible());
    await userEvent.unhover(canvas.getByRole('button', { name: 'About revenue' }));
    await userEvent.hover(canvas.getByRole('button', { name: 'About orders' }));
    await waitFor(() => expect(page.getByText('Orders shipped.')).toBeVisible());
    await expect(page.getByText('Orders shipped.')).toHaveAttribute('data-instant');
  },
});
