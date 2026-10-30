import { useMemo, useState, type CSSProperties } from 'react';
import { applyFilters, type FilterState } from '../data/transforms';
import { useDatasets } from '../data/useDatasets';
import { PanelErrorBoundary, PanelRenderer } from '../renderers/PanelRenderer';
import type { DashboardSpec } from '../spec/types';
import { FilterBar } from './FilterBar';

export function DashboardView({ spec }: { spec: DashboardSpec }) {
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
        <p className="status panel-error" role="alert">
          {datasets.error}
        </p>
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
                    data-renderer={panel.renderer}
                    aria-labelledby={`panel-${id}-title`}
                  >
                    <h2 id={`panel-${id}-title`} title={panel.description}>
                      {panel.title}
                    </h2>
                    <div className="panel-body">
                      <PanelErrorBoundary>
                        <PanelRenderer
                          panel={panel}
                          dataset={spec.datasets[panel.dataset]}
                          rows={panelRows[id] ?? []}
                        />
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
