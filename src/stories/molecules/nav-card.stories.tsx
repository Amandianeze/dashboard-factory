import { expect } from 'storybook/test';
import preview from '../../../.storybook/preview';
import { NavCard } from '../../components/ui/nav-card';

const meta = preview.meta({
  title: 'Molecules/NavCard',
  component: NavCard,
  args: {
    href: '#/d/revenue-overview',
    title: 'Revenue overview',
    description: 'Weekly revenue by region and product.',
    file: 'revenue-overview.dashboard.yaml',
  },
  decorators: [
    (Story) => (
      <ul className="index">
        <Story />
      </ul>
    ),
  ],
});

export const Link = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: /Revenue overview/ })).toHaveAttribute(
      'href',
      '#/d/revenue-overview',
    );
  },
});

/** An invalid spec: not a link, lists its validation errors. */
export const Invalid = meta.story({
  args: {
    href: undefined,
    title: 'broken.dashboard.yaml',
    errors: [
      'panels.trend.kind: kind "kpi-card" renders with kpi, not "vega-lite"',
      'panels.trend.spec: field "segment" is not declared in dataset "sales"',
    ],
  },
});
