import { expect } from 'storybook/test';
import preview from '../../../.storybook/preview';
import { FormattedValue } from '../../components/ui/formatted-value';

const meta = preview.meta({
  title: 'Atoms/FormattedValue',
  component: FormattedValue,
  args: { value: 3496113, format: '$,.0f' },
});

export const Body = meta.story({});

/** KPI size, with tabular numerals even though the font shorthand would reset them. */
export const Kpi = meta.story({
  args: { size: 'kpi' },
  play: async ({ canvas }) => {
    const el = canvas.getByText('$3,496,113');
    await expect(getComputedStyle(el).fontVariantNumeric).toContain('tabular-nums');
  },
});
export const Negative = meta.story({ args: { value: -23.59, format: ',.2f' } });
/** Missing values read as "no data", not "dash". */
export const Missing = meta.story({
  args: { value: Number.NaN },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('no data')).toBeInTheDocument();
  },
});
/** break-ui: 10⁹ at KPI size. */
export const Huge = meta.story({ args: { value: 1_234_567_890, size: 'kpi' } });
