import { useEffect, useMemo, useRef, useState } from 'react';
import type { Row } from '../data/transforms';
import { useElementSize } from '../hooks/useElementSize';
import type { PlotlyPanel } from '../spec/types';
import { buildPlotlyFigure } from './plotlyFigure';

type PlotlyModule = typeof import('plotly.js');
/** Lazy-load the basic Plotly bundle so dashboards without Plotly panels never pay for it. */
let plotlyPromise: Promise<PlotlyModule> | undefined;
const loadPlotly = () =>
  (plotlyPromise ??= import('plotly.js-basic-dist-min').then(
    (m) => ((m as { default?: PlotlyModule }).default ?? m) as PlotlyModule,
  ));

export function PlotlyChart({ panel, rows }: { panel: PlotlyPanel; rows: Row[] }) {
  const [sizeRef, size] = useElementSize<HTMLDivElement>();
  const plotRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>();
  const figure = useMemo(() => buildPlotlyFigure(panel, rows), [panel, rows]);

  useEffect(() => {
    const el = plotRef.current;
    if (!el || !size.width || !size.height) return;
    let cancelled = false;
    loadPlotly()
      .then((Plotly) => {
        if (cancelled) return;
        return Plotly.react(
          el,
          figure.data,
          { ...figure.layout, width: size.width, height: size.height },
          { displayModeBar: false, responsive: false },
        );
      })
      .catch((e: unknown) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, [figure, size.width, size.height]);

  useEffect(() => {
    const el = plotRef.current;
    return () => {
      if (el) void loadPlotly().then((Plotly) => Plotly.purge(el));
    };
  }, []);

  if (error) throw new Error(error);
  return (
    <div ref={sizeRef} className="chart-fill">
      <div ref={plotRef} />
    </div>
  );
}
