import { useEffect, useMemo, useRef, useState } from 'react';
import type { Row } from '../data/transforms';
import type { VegaLitePanel } from '../spec/types';
import { buildVegaLiteSpec } from './vegaLiteSpec';

/** Lazy-load Vega so it lands in its own chunk, fetched only by dashboards that use it. */
let embedPromise: Promise<typeof import('vega-embed').default> | undefined;
const loadEmbed = () => (embedPromise ??= import('vega-embed').then((m) => m.default));

export function VegaLiteChart({ panel, rows }: { panel: VegaLitePanel; rows: Row[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>();
  const spec = useMemo(() => buildVegaLiteSpec(panel, rows), [panel, rows]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    let finalize: (() => void) | undefined;
    loadEmbed()
      .then((embed) =>
        cancelled ? undefined : embed(el, spec, { actions: false, renderer: 'svg' }),
      )
      .then((result) => {
        if (!result) return;
        if (cancelled) result.finalize();
        else {
          finalize = result.finalize;
          setError(undefined);
        }
      })
      .catch((e: unknown) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
      finalize?.();
    };
  }, [spec]);

  if (error) throw new Error(error);
  // vega-embed injects `.vega-embed { position: relative; display: inline-block }`, so embed into
  // an inner host and let the outer div own absolute sizing (see .vl-host in styles.css).
  return (
    <div className="chart-fill">
      <div ref={ref} className="vl-host" />
    </div>
  );
}
