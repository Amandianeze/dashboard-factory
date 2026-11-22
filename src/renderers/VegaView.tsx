import { useEffect, useRef, useState } from 'react';
import type { TopLevelSpec } from 'vega-lite';
import type { OnChartData } from '../data/chartData';

/** Lazy-load Vega and the code that reads it, fetched only by dashboards that use them. */
const load = () =>
  Promise.all([import('vega-embed'), import('./vegaChartData')]).then(([embed, reader]) => ({
    embed: embed.default,
    read: reader.vegaChartData,
  }));
let loading: ReturnType<typeof load> | undefined;
const loadVega = () => (loading ??= load());

export type RenderedSize = { width: number; height: number };

/**
 * Embed a compiled Vega-Lite spec. Shared by the vega-lite and flint renderers. `onRendered`
 * reports the drawn chart's full size (plot, axes and legends) so a caller can fit it to its box.
 */
export function VegaView({
  spec,
  onData,
  onRendered,
}: {
  spec: TopLevelSpec;
  onData?: OnChartData;
  onRendered?: (size: RenderedSize) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    let finalize: (() => void) | undefined;
    loadVega()
      .then(async ({ embed, read }) => {
        if (cancelled) return;
        const result = await embed(el, spec, { actions: false, renderer: 'svg' });
        if (cancelled) result.finalize();
        else {
          finalize = result.finalize;
          setError(undefined);
          onData?.(read(spec, result.vgSpec, (name) => result.view.data(name)));
          const svg = el.querySelector('svg')?.getBoundingClientRect();
          if (svg) onRendered?.({ width: svg.width, height: svg.height });
        }
      })
      .catch((e: unknown) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
      finalize?.();
    };
  }, [spec, onData, onRendered]);

  if (error) throw new Error(error);
  // vega-embed injects `.vega-embed { position: relative; display: inline-block }`, so embed into
  // an inner host and let the outer .chart-fill own absolute sizing (see .vl-host in styles.css).
  return <div ref={ref} className="vl-host" />;
}
