import { expect, fn, userEvent } from 'storybook/test';
import preview from '../../../.storybook/preview';
import { Button } from '../../components/ui/button';

const meta = preview.meta({
  title: 'Atoms/Button',
  component: Button,
  args: { children: 'Apply filters', onClick: fn() },
});

export const Primary = meta.story({ args: { variant: 'primary' } });
export const Secondary = meta.story({ args: { variant: 'secondary' } });
export const Ghost = meta.story({ args: { variant: 'ghost', children: 'Clear' } });
export const Small = meta.story({ args: { size: 'sm' } });
export const Disabled = meta.story({ args: { disabled: true } });
export const Loading = meta.story({
  args: { variant: 'primary', loading: true, children: 'Saving' },
  play: async ({ canvas, args }) => {
    const button = canvas.getByRole('button', { name: 'Saving' });
    await expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
});

/** Enter and Space activate it; it is a real button. */
export const Keyboard = meta.story({
  play: async ({ canvas, args }) => {
    const button = canvas.getByRole('button', { name: 'Apply filters' });
    await expect(button).toHaveAttribute('type', 'button');
    button.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    await expect(args.onClick).toHaveBeenCalledTimes(2);
  },
});

/** break-ui: long label (labels never wrap; a long one is a content problem to fix). */
export const LongLabel = meta.story({
  args: { children: 'Export every row of the filtered table to a spreadsheet file' },
});
