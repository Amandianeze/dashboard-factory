import { expect, userEvent } from 'storybook/test';
import preview from '../../../.storybook/preview';
import type { TableColumn } from '../../../docs/lld/data-table.props';
import { DataTable } from '../../components/panels/data-table';
import { PanelFrame } from '../../components/panels/panel-frame';
import { manyOrderRows, NarrowCell, orderRows, PanelCell } from '../fixtures';

const columns: TableColumn[] = [
  { field: 'order', label: 'Order' },
  { field: 'customer', label: 'Customer' },
  {
    field: 'status',
    label: 'Status',
    badges: { Shipped: 'success', Pending: 'info', Delayed: 'warning', Cancelled: 'danger' },
  },
  { field: 'revenue', label: 'Revenue', format: '$,.2f' },
  { field: 'change', label: 'Change', format: '+,.0f', conditional: 'sign' },
];

const meta = preview.meta({
  title: 'Organisms/DataTable',
  component: DataTable,
  args: { columns, rows: orderRows, caption: 'Orders', limit: 10 },
  decorators: [
    (Story) => (
      <PanelCell>
        <PanelFrame id="orders" title="Orders" kind="data-table" span={12}>
          <Story />
        </PanelFrame>
      </PanelCell>
    ),
  ],
});

export const Orders = meta.story({});

/** Sortable headers per the APG example: a button in the th, aria-sort on the sorted column. */
export const SortsByKeyboard = meta.story({
  play: async ({ canvas }) => {
    const revenue = canvas.getByRole('button', { name: /Revenue/ });
    revenue.focus();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByRole('columnheader', { name: /Revenue/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByRole('columnheader', { name: /Revenue/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  },
});

export const SortedOnLoad = meta.story({ args: { sort: { field: 'revenue', order: 'desc' } } });

/** break-ui: 10,000 rows, shown 10 at a time until "Show all". */
export const TenThousandRows = meta.story({
  args: { rows: manyOrderRows },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('row')).toHaveLength(11);
    await expect(canvas.getByRole('button', { name: 'Show all 10,000 rows' })).toBeVisible();
  },
});

export const NoRows = meta.story({ args: { rows: [] } });

/** break-ui: a narrow cell scrolls inside a focusable region. */
export const Narrow = meta.story({
  decorators: [(Story) => <NarrowCell>{Story()}</NarrowCell>],
});

/** break-ui: right-to-left. */
export const RightToLeft = meta.story({
  decorators: [
    (Story) => (
      <div dir="rtl">
        <Story />
      </div>
    ),
  ],
});

/** break-ui: missing values. */
export const MissingValues = meta.story({
  args: { rows: orderRows.map((r, i) => (i % 3 ? r : { ...r, revenue: null, status: '' })) },
});
