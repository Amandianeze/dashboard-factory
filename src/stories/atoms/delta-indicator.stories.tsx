import { expect } from 'storybook/test';
import preview from '../../../.storybook/preview';
import { DeltaIndicator } from '../../components/ui/delta-indicator';

const meta = preview.meta({
  title: 'Atoms/DeltaIndicator',
  component: DeltaIndicator,
  args: { value: 23.59, format: '+,.2f', comparisonLabel: 'versus previous close' },
});

export const Up = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByText('up 23.59 versus previous close')).toBeInTheDocument();
  },
});
export const Down = meta.story({ args: { value: -23.59 } });
export const Unchanged = meta.story({ args: { value: 0 } });
export const Percent = meta.story({ args: { value: -0.003046, format: '+.2%' } });
/** Costs: a rise is bad, so it takes the negative colour while the glyph still points up. */
export const DownIsGood = meta.story({ args: { value: 4.2, polarity: 'down-is-good' } });
export const Missing = meta.story({ args: { value: null } });
/** break-ui: 10⁹. */
export const Huge = meta.story({ args: { value: 1_234_567_890.12 } });
