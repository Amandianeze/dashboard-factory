import { useState } from 'react';
import { expect, userEvent } from 'storybook/test';
import preview from '../../../.storybook/preview';
import type { FilterState } from '../../data/transforms';
import { FilterBar } from '../../dashboard/FilterBar';
import type { FilterSpec } from '../../spec/types';
import { salesRows } from '../fixtures';

const filters: FilterSpec[] = [
  {
    id: 'region',
    label: 'Region',
    type: 'multiselect',
    dataset: 'sales',
    field: 'region',
    appliesTo: ['p'],
  },
  {
    id: 'product',
    label: 'Product',
    type: 'select',
    dataset: 'sales',
    field: 'product',
    appliesTo: ['p'],
  },
];

function StatefulFilterBar({ initial = {} }: { initial?: FilterState }) {
  const [state, setState] = useState<FilterState>(initial);
  return (
    <FilterBar filters={filters} data={{ sales: salesRows }} state={state} onChange={setState} />
  );
}

const meta = preview.meta({ title: 'Organisms/FilterBar', component: StatefulFilterBar });

export const Default = meta.story({});

/** Selecting a chip shows Clear (a ghost Button); Clear empties the filter. */
export const SelectAndClear = meta.story({
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'South' }));
    await expect(canvas.getByRole('button', { name: 'South' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Clear' }));
    await expect(canvas.getByRole('button', { name: 'South' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await expect(canvas.queryByRole('button', { name: 'Clear' })).toBeNull();
  },
});

export const Preselected = meta.story({
  args: { initial: { region: ['North', 'East'], product: ['Cobalt'] } },
});
