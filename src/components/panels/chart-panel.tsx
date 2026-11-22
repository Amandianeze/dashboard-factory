/**
 * Chart panel (docs/lld/chart-panel.md): a chart with its text alternative. The plot is one image,
 * described by a generated summary; the Table toggle swaps in a DataTable of the rows it drew.
 */
import { useMemo, useState } from 'react';
import type { ChartPanelProps } from '../../../docs/lld/chart-panel.props';
import { sourceData, summarize, type ChartData } from '../../data/chartData';
import { cn } from '../../lib/cn';
import { PanelRenderer } from '../../renderers/PanelRenderer';
import { Button } from '../ui/button';
import { EmptyState } from '../ui/empty-state';
import { DataTable } from './data-table';
import { PanelFrame } from './panel-frame';

export type { ChartPanelProps };

export function ChartPanel({ id, span, panel, dataset, rows, empty }: ChartPanelProps) {
  const [showTable, setShowTable] = useState(false);
  // undefined until the engine draws; null when what it drew can't be read.
  const [drawn, setDrawn] = useState<ChartData | null>();

  const data = useMemo(
    () => (drawn === null ? sourceData(rows, dataset?.fields ?? {}) : drawn),
    [drawn, rows, dataset],
  );
  const summary = useMemo(() => data && summarize(data), [data]);
  const hasRows = rows.length > 0;

  const toggle = hasRows && (
    <Button
      variant={showTable ? 'secondary' : 'ghost'}
      size="sm"
      className="ms-auto"
      aria-pressed={showTable}
      // Starts with the visible word (WCAG 2.5.3) and tells the panels apart.
      aria-label={`Table view of ${panel.title}`}
      onClick={() => setShowTable((on) => !on)}
    >
      Table
    </Button>
  );

  return (
    <PanelFrame
      id={id}
      title={panel.title}
      description={panel.description}
      kind={panel.kind}
      span={span}
      actions={toggle}
    >
      {hasRows ? (
        <>
          {/* Stays mounted and sized under the table, so the rows follow filters and resizes. */}
          <div
            role="img"
            aria-labelledby={`panel-${id}-title`}
            aria-describedby={summary ? `panel-${id}-summary` : undefined}
            className={cn('chart-fill', showTable && 'invisible')}
          >
            <PanelRenderer panel={panel} dataset={dataset} rows={rows} onData={setDrawn} />
          </div>
          {summary && (
            <p id={`panel-${id}-summary`} hidden>
              {panel.description ? `${panel.description} ` : ''}
              {summary}
            </p>
          )}
          {showTable && data && (
            <div className="chart-fill">
              <DataTable columns={data.columns} rows={data.rows} caption={panel.title} />
            </div>
          )}
        </>
      ) : (
        (empty ?? <EmptyState variant="empty" title="No data yet" />)
      )}
    </PanelFrame>
  );
}
