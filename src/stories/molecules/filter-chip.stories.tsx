import { useState } from 'react';
import { expect, fn, userEvent } from 'storybook/test';
import preview from '../../../.storybook/preview';
import { FilterChip } from '../../components/panels/filter-chip';

function StatefulChip({ label }: { label: string }) {
  const [pressed, setPressed] = useState(false);
  return <FilterChip label={label} pressed={pressed} onPressedChange={setPressed} />;
}

const meta = preview.meta({
  title: 'Molecules/FilterChip',
  component: FilterChip,
  args: { label: 'North', pressed: false, onPressedChange: fn() },
});

export const Off = meta.story({});
export const On = meta.story({ args: { pressed: true } });
export const Disabled = meta.story({ args: { disabled: true } });

/** Toggle button pattern: aria-pressed carries the state, Space toggles it. */
export const Toggles = meta.story({
  render: (args) => <StatefulChip label={args.label} />,
  play: async ({ canvas }) => {
    const chip = canvas.getByRole('button', { name: 'North' });
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
    chip.focus();
    await userEvent.keyboard(' ');
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
  },
});
