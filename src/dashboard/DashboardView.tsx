import { useMemo, useState, type CSSProperties } from 'react';
import { applyFilters, filterAnnouncement, type FilterState } from '../data/transforms';
import { useDatasets } from '../data/useDatasets';
import { PanelRenderer } from '../renderers/PanelRenderer';
import type { DashboardTemplateProps } from '../../docs/lld/dashboard-template.props';
import { ChartPanel } from '../components/panels/chart-panel';
import { PanelFrame } from '../components/panels/panel-frame';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { TitleBand } from '../components/ui/title-band';
import { FilterBar } from './FilterBar';

export type { DashboardTemplateProps };

export function DashboardView({ spec, actions }: DashboardTemplateProps) {
  const datasets = useDatasets(spec.datasets);
  const [filterState, setFilterState] = useState<FilterState>({});
  // Silent until the first change: on load the page itself is the news.
  const [filtersChanged, setFiltersChanged] = useState(false);
  const changeFilters = (next: FilterState) => {
    setFilterState(next);
    setFiltersChanged(true);
  };

  const panelRows = useMemo(() => {
    if (datasets.status !== 'ready') return {};
    return Object.fromEntries(
      Object.entries(spec.panels).map(([id, p]) => [
        id,
        applyFilters(datasets.data[p.dataset] ?? [], id, spec.filters, filterState),
      ]),
    );
  }, [datasets, spec, filterState]);

  const announcement = filtersChanged
    ? filterAnnouncement(
        spec.filters,
        filterState,
        Object.values(panelRows).filter((rows) => rows.length === 0).length,
      )
    : '';

  return (
    <main className="dashboard" data-testid={`dashboard-${spec.id}`}>
      <TitleBand title={spec.title} description={spec.description} actions={actions} />

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
            onChange={changeFilters}
          />
          <p role="status" className="sr-only" data-testid="filter-status">
            {announcement}
          </p>
          {spec.layout.rows.map((row, r) => (
            <div key={r} className="row" style={{ '--row-h': `${row.height}px` } as CSSProperties}>
              {row.cells.map(({ panel: id, span }) => {
                const panel = spec.panels[id]!;
                const rowsShown = panelRows[id] ?? [];
                const noRows = (
                  <NoRows
                    filtered={(datasets.data[panel.dataset] ?? []).length > 0}
                    onClear={() => changeFilters(clearFor(id, spec.filters, filterState))}
                  />
                );
                if (panel.renderer !== 'kpi' && panel.renderer !== 'table')
                  return (
                    <ChartPanel
                      key={id}
                      id={id}
                      span={span}
                      panel={panel}
                      dataset={spec.datasets[panel.dataset]}
                      rows={rowsShown}
                      empty={noRows}
                    />
                  );
                return (
                  <PanelFrame
                    key={id}
                    id={id}
                    title={panel.title}
                    description={panel.description}
                    kind={panel.kind}
                    span={span}
                  >
                    {panel.renderer === 'table' && rowsShown.length === 0 ? (
                      noRows
                    ) : (
                      <PanelRenderer
                        panel={panel}
                        dataset={spec.datasets[panel.dataset]}
                        rows={rowsShown}
                      />
                    )}
                  </PanelFrame>
                );
              })}
            </div>
          ))}
        </>
      )}
    </main>
  );
}

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
