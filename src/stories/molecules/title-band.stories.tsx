import { expect } from 'storybook/test';
import preview from '../../../.storybook/preview';
import { TitleBand } from '../../components/ui/title-band';

const meta = preview.meta({
  title: 'Molecules/TitleBand',
  component: TitleBand,
  args: {
    title: 'Revenue overview',
    description: 'Weekly revenue by region and product, for the sales leads’ Monday review.',
  },
});

export const Default = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1 })).toHaveTextContent('Revenue overview');
  },
});
export const TitleOnly = meta.story({ args: { description: undefined } });
/** break-ui: a 120-character title wraps. */
export const LongTitle = meta.story({
  args: {
    title:
      'Revenue, orders and active products by region, product line and week for the North American and European sales teams',
  },
});
