import { useEffect, useState } from 'react';
import type { TopLevelSpec } from 'vega-lite';
import type { Row } from '../data/transforms';
import { useElementSize } from '../hooks/useElementSize';
import type { DatasetSpec, FlintPanel } from '../spec/types';
import { VegaView } from './VegaView';

/** Lazy-load Flint (and its compiler) so dashboards without Flint panels never pay for it. */
let flintPromise: Promise<typeof import('./flintSpec')> | undefined;
const loadFlint = () => (flintPromise ??= import('./flintSpec'));

export function FlintChart({
  panel,
  rows,
  semantics,
}: {
  panel: FlintPanel;
  rows: Row[];
  semantics: DatasetSpec['semantics'];
}) {
  const [ref, { width, height }] = useElementSize<HTMLDivElement>();
  const [spec, setSpec] = useState<TopLevelSpec>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!width || !height) return;
    let cancelled = false;
    loadFlint()
      .then(({ buildFlintSpec }) => {
        if (!cancelled) setSpec(buildFlintSpec(panel, rows, semantics, { width, height }));
      })
      .catch((e: unknown) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, [panel, rows, semantics, width, height]);

  if (error) throw new Error(error);
  return (
    <div ref={ref} className="chart-fill">
      {spec && <VegaView spec={spec} />}
    </div>
  );
}
