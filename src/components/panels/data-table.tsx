/**
 * Data table (docs/lld/data-table.md). Native table with a caption, sortable headers per the APG
 * sortable-table example (a button in each th, aria-sort on the sorted one), numbers in tabular
 * numerals aligned to the end, and a "Show all" step after `limit` rows.
 */
import { useMemo, useState } from 'react';
import type { DataTableProps, TableColumn, TableSort } from '../../../docs/lld/data-table.props';
import type { Row } from '../../data/transforms';
import { cn } from '../../lib/cn';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { EmptyState } from '../ui/empty-state';
import { FormattedValue } from '../ui/formatted-value';

export type { DataTableProps };

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** Stable sort; numbers numerically, everything else with a locale-aware collator; blanks last. */
export function sortRows(rows: Row[], sort: TableSort | undefined): Row[] {
  if (!sort) return rows;
  const dir = sort.order === 'asc' ? 1 : -1;
  const blank = (v: unknown) => v === null || v === undefined || v === '';
  return rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => {
      const x = a.row[sort.field];
      const y = b.row[sort.field];
      if (blank(x) || blank(y)) return blank(x) === blank(y) ? a.i - b.i : blank(x) ? 1 : -1;
      const c =
        typeof x === 'number' && typeof y === 'number'
          ? x - y
          : collator.compare(String(x), String(y));
      return c === 0 ? a.i - b.i : c * dir;
    })
    .map(({ row }) => row);
}

const isNumeric = (col: TableColumn, rows: Row[]) =>
  col.format !== undefined || rows.some((r) => typeof r[col.field] === 'number');

const SIGN = {
  pos: 'text-(color:--kpi-delta-positive-text)',
  neg: 'text-(color:--kpi-delta-negative-text)',
} as const;

function Cell({ col, value, numeric }: { col: TableColumn; value: unknown; numeric: boolean }) {
  if (col.badges) {
    if (value === null || value === undefined || value === '') return null;
    const text = String(value);
    return <Badge tone={col.badges[text] ?? 'neutral'}>{text}</Badge>;
  }
  if (numeric) {
    const n = typeof value === 'number' ? value : Number(value);
    const tone =
      col.conditional === 'sign' && n > 0
        ? SIGN.pos
        : col.conditional === 'sign' && n < 0
          ? SIGN.neg
          : '';
    return (
      <span className={tone}>
        <FormattedValue
          value={value === null || value === undefined || value === '' ? null : n}
          format={col.format ?? ',.6~f'}
        />
      </span>
    );
  }
  return <>{value === null || value === undefined ? '' : String(value)}</>;
}

export function DataTable({
  columns,
  rows,
  caption,
  sort: initialSort,
  limit = 50,
}: DataTableProps) {
  const [sort, setSort] = useState<TableSort | undefined>(initialSort);
  const [showAll, setShowAll] = useState(false);
  const sorted = useMemo(() => sortRows(rows, sort), [rows, sort]);
  const numeric = useMemo(
    () => Object.fromEntries(columns.map((c) => [c.field, isNumeric(c, rows)])),
    [columns, rows],
  );

  if (!rows.length) return <EmptyState variant="empty" title="No rows to show" size="compact" />;
  const visible = showAll ? sorted : sorted.slice(0, limit);

  const toggle = (field: string) =>
    setSort((s) =>
      s?.field === field
        ? { field, order: s.order === 'asc' ? 'desc' : 'asc' }
        : { field, order: numeric[field] ? 'desc' : 'asc' },
    );

  const cellPad = 'px-(--table-cell-padding-x) py-(--table-cell-padding-y)';
  return (
    <div className="flex h-full flex-col gap-(--space-stack-xs)">
      <div
        role="region"
        aria-label={caption}
        // Focusable so keyboard users can scroll a wide or long table (WCAG 2.1.1).
        tabIndex={0}
        className="min-h-0 flex-1 overflow-auto focus-visible:outline-(length:--button-focus-width) focus-visible:outline-solid focus-visible:outline-(color:--table-focus-ring)"
      >
        <table className="w-full border-collapse bg-(--table-bg) text-(color:--table-text) [font:var(--table-cell-typography-font)]">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((col) => {
                const active = sort?.field === col.field;
                const end = (col.align ?? (numeric[col.field] ? 'end' : 'start')) === 'end';
                return (
                  <th
                    key={col.field}
                    scope="col"
                    aria-sort={
                      active ? (sort.order === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                    className={cn(
                      'sticky top-0 bg-(--table-bg) font-[inherit]',
                      'border-b-(length:--border-width-hairline) border-solid border-(color:--table-row-border)',
                      end ? 'text-end' : 'text-start',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(col.field)}
                      className={cn(
                        cellPad,
                        'inline-flex w-full cursor-pointer items-center gap-(--space-inline-xs) border-0 bg-transparent',
                        '[font:var(--table-header-typography-font)] text-(color:--table-header-text)',
                        'focus-visible:outline-(length:--button-focus-width) focus-visible:outline-solid focus-visible:outline-(color:--table-focus-ring)',
                        end && 'flex-row-reverse',
                      )}
                    >
                      {col.label ?? col.field}
                      <span aria-hidden className="text-(color:--table-sort-icon)">
                        {active ? (sort.order === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => (
              <tr
                key={i}
                className="border-b-(length:--border-width-hairline) border-solid border-(color:--table-row-border) hover:bg-(--table-row-hover-bg)"
              >
                {columns.map((col) => {
                  const end = (col.align ?? (numeric[col.field] ? 'end' : 'start')) === 'end';
                  return (
                    <td key={col.field} className={cn(cellPad, end ? 'text-end' : 'text-start')}>
                      <Cell col={col} value={row[col.field]} numeric={!!numeric[col.field]} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length > limit && (
        <div>
          <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
            {showAll ? `Show first ${limit}` : `Show all ${sorted.length.toLocaleString()} rows`}
          </Button>
        </div>
      )}
    </div>
  );
}
