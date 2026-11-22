import { expect, fn, userEvent } from 'storybook/test';
import preview from '../../../.storybook/preview';
import { Select } from '../../components/ui/select';
import { PRODUCTS } from '../fixtures';

const meta = preview.meta({
  title: 'Atoms/Select',
  component: Select,
  args: { label: 'Product', options: PRODUCTS, value: null, onChange: fn() },
});

export const All = meta.story({});
export const Chosen = meta.story({ args: { value: 'Cobalt' } });
export const Disabled = meta.story({ args: { disabled: true } });

export const ChoosesAValue = meta.story({
  play: async ({ canvas, args }) => {
    await userEvent.selectOptions(canvas.getByRole('combobox', { name: 'Product' }), 'Beacon');
    await expect(args.onChange).toHaveBeenCalledWith('Beacon');
  },
});
