import { useEffect, useRef, useState } from 'react';
import type { TopLevelSpec } from 'vega-lite';

/** Lazy-load Vega so it lands in its own chunk, fetched only by dashboards that use it. */
let embedPromise: Promise<typeof import('vega-embed').default> | undefined;
const loadEmbed = () => (embedPromise ??= import('vega-embed').then((m) => m.default));

/** Embed a compiled Vega-Lite spec. Shared by the vega-lite and flint renderers. */
export function VegaView({ spec }: { spec: TopLevelSpec }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>();

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
  // an inner host and let the outer .chart-fill own absolute sizing (see .vl-host in styles.css).
  return <div ref={ref} className="vl-host" />;
}
