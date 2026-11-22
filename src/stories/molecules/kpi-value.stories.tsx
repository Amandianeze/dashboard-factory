import { expect } from 'storybook/test';
import preview from '../../../.storybook/preview';
import { KpiComparison } from '../../../docs/lld/kpi-value.props';
import { KpiValue } from '../../components/panels/kpi-value';
import { NarrowCell } from '../fixtures';

const comparison = KpiComparison.parse({
  compareTo: { field: 'previous_close' },
  label: 'previous close',
});

const meta = preview.meta({
  title: 'Molecules/KpiValue',
  component: KpiValue,
  args: { current: 7720.39, previous: 7743.98, format: ',.2f', comparison },
});

/** Reads as one sentence: value, then each change "versus previous close". */
export const Down = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText(/versus previous close/)).toHaveLength(2);
    await expect(canvas.getByText('7,743.98')).toBeInTheDocument();
  },
});
export const Up = meta.story({ args: { current: 7790.1 } });
export const DeltaOnly = meta.story({ args: { comparison: { ...comparison, show: ['delta'] } } });
export const PreviousMissing = meta.story({ args: { previous: null } });
/** No percentage against zero. */
export const PreviousZero = meta.story({ args: { current: 12, previous: 0, format: ',.0f' } });
/** break-ui: wraps under the value in a narrow cell. */
export const Narrow = meta.story({
  args: { current: 1_234_567_890, previous: 1_200_000_000, format: '$,.0f' },
  decorators: [(Story) => <NarrowCell>{Story()}</NarrowCell>],
});
