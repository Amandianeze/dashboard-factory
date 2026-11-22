import { expect, userEvent, waitFor, within } from 'storybook/test';
import preview from '../../../.storybook/preview';
import { PanelFrame } from '../../components/panels/panel-frame';
import { PanelCell } from '../fixtures';

const Boom = () => {
  throw new Error('Vega-Lite compile failed: unknown mark "barz"');
};

const meta = preview.meta({
  title: 'Molecules/PanelFrame',
  component: PanelFrame,
  args: {
    id: 'example',
    title: 'Revenue by product',
    kind: 'chart-panel' as const,
    span: 12,
    children: 'Panel body',
  },
  decorators: [(Story) => <PanelCell>{Story()}</PanelCell>],
});

export const Default = meta.story({
  args: { children: 'Panel body' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('region', { name: 'Revenue by product' })).toBeInTheDocument();
  },
});

/** The description is on a focusable ⓘ button with a Tooltip, not in title= (Gate 3, #3). */
export const WithDescription = meta.story({
  args: {
    children: 'Panel body',
    description: 'Top ten products by revenue; bars are sorted largest first.',
  },
  play: async ({ canvas, canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'About Revenue by product' })).toHaveFocus();
    await waitFor(() =>
      expect(
        page.getByText('Top ten products by revenue; bars are sorted largest first.'),
      ).toBeVisible(),
    );
  },
});

/** One failing panel shows an error state and never takes the page down. */
export const Crashed = meta.story({
  args: { children: <Boom /> },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('alert')).toHaveTextContent('This panel failed to render');
  },
});
