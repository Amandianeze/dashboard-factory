import { useMemo, useState, type CSSProperties } from 'react';
import { applyFilters, type FilterState } from '../data/transforms';
import { useDatasets } from '../data/useDatasets';
import { PanelErrorBoundary, PanelRenderer } from '../renderers/PanelRenderer';
import type { DashboardTemplateProps } from '../../docs/lld/dashboard-template.props';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { Tooltip } from '../components/ui/tooltip';
import type { Row } from '../data/transforms';
import type { PanelSpec } from '../spec/types';
import { FilterBar } from './FilterBar';

export type { DashboardTemplateProps };

export function DashboardView({ spec }: DashboardTemplateProps) {
  const datasets = useDatasets(spec.datasets);
  const [filterState, setFilterState] = useState<FilterState>({});

  const panelRows = useMemo(() => {
    if (datasets.status !== 'ready') return {};
    return Object.fromEntries(
      Object.entries(spec.panels).map(([id, p]) => [
        id,
        applyFilters(datasets.data[p.dataset] ?? [], id, spec.filters, filterState),
      ]),
    );
  }, [datasets, spec, filterState]);

  return (
    <main className="dashboard" data-testid={`dashboard-${spec.id}`}>
      <header className="dashboard-header">
        <h1>{spec.title}</h1>
        {spec.description && <p>{spec.description}</p>}
      </header>

      {datasets.status === 'loading' && <p className="status">Loading data…</p>}
      {datasets.status === 'error' && (
        <EmptyState variant="error" title="The data didn't load" description={datasets.error} />
      )}

      {datasets.status === 'ready' && (
        <>
          <FilterBar
            filters={spec.filters}
            data={datasets.data}
            state={filterState}
            onChange={setFilterState}
          />
          {spec.layout.rows.map((row, r) => (
            <div key={r} className="row" style={{ '--row-h': `${row.height}px` } as CSSProperties}>
              {row.cells.map(({ panel: id, span }) => {
                const panel = spec.panels[id]!;
                return (
                  <section
                    key={id}
                    className={`panel panel-${panel.renderer}`}
                    style={{ '--span': span } as CSSProperties}
                    data-testid={`panel-${id}`}
                    data-kind={panel.kind}
                    data-renderer={panel.renderer}
                    aria-labelledby={`panel-${id}-title`}
                  >
                    <div className="panel-head">
                      <h2 id={`panel-${id}-title`}>{panel.title}</h2>
                      {panel.description && (
                        <Tooltip content={panel.description}>
                          <Button variant="ghost" size="sm" aria-label={`About ${panel.title}`}>
                            ⓘ
                          </Button>
                        </Tooltip>
                      )}
                    </div>
                    <div className="panel-body">
                      <PanelErrorBoundary>
                        {isEmptyChart(panel, panelRows[id]) ? (
                          <NoRows
                            filtered={(datasets.data[panel.dataset] ?? []).length > 0}
                            onClear={() => setFilterState(clearFor(id, spec.filters, filterState))}
                          />
                        ) : (
                          <PanelRenderer
                            panel={panel}
                            dataset={spec.datasets[panel.dataset]}
                            rows={panelRows[id] ?? []}
                          />
                        )}
                      </PanelErrorBoundary>
                    </div>
                  </section>
                );
              })}
            </div>
          ))}
        </>
      )}
    </main>
  );
}

/** Charts and tables with no rows show an EmptyState instead of empty axes (Gate 3, #4). KPIs keep their dash. */
const isEmptyChart = (panel: PanelSpec, rows: Row[] | undefined) =>
  panel.kind !== 'kpi-card' && (rows ?? []).length === 0;

/** Filter state with every filter that applies to `panelId` cleared. */
function clearFor(
  panelId: string,
  filters: DashboardTemplateProps['spec']['filters'],
  state: FilterState,
): FilterState {
  const next = { ...state };
  for (const f of filters) if (f.appliesTo.includes(panelId)) delete next[f.id];
  return next;
}

function NoRows({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return filtered ? (
    <EmptyState
      variant="filtered"
      title="Nothing matches these filters"
      action={
        <Button variant="secondary" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      }
    />
  ) : (
    <EmptyState variant="empty" title="No data yet" />
  );
}
