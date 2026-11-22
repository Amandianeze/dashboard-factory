import { useCallback, useEffect, useRef, useState } from 'react';
import type { TopLevelSpec } from 'vega-lite';
import type { OnChartData } from '../data/chartData';
import type { Row } from '../data/transforms';
import { useElementSize } from '../hooks/useElementSize';
import type { DatasetSpec, FlintPanel } from '../spec/types';
import { useTheme } from '../theme/ThemeProvider';
import { bandStep, MIN_BAND_STEP } from './flintFit';
import { VegaView, type RenderedSize } from './VegaView';

/** Lazy-load Flint (and its compiler) so dashboards without Flint panels never pay for it. */
let flintPromise: Promise<typeof import('./flintSpec')> | undefined;
const loadFlint = () => (flintPromise ??= import('./flintSpec'));
const MAX_FITS = 3;
const NO_TRIM = { px: 0, tries: 0, width: 0 };

export function FlintChart({
  panel,
  rows,
  semantics,
  onData,
}: {
  panel: FlintPanel;
  rows: Row[];
  semantics: DatasetSpec['semantics'];
  onData?: OnChartData;
}) {
  const [ref, { width, height }] = useElementSize<HTMLDivElement>();
  const { theme } = useTheme();
  // A spec remembers the width and trim it was built for, so a late or repeated render report
  // can't count the same overflow twice or apply an old width's overflow to a new one.
  const [built, setBuilt] = useState<{ spec: TopLevelSpec; width: number; trim: number }>();
  const [trim, setTrim] = useState(NO_TRIM);
  const [error, setError] = useState<string>();
  const latestWidth = useRef(width);
  latestWidth.current = width;
  useEffect(() => setTrim(NO_TRIM), [panel, rows, semantics, width, height, theme]);

  useEffect(() => {
    if (!width || !height) return;
    let cancelled = false;
    // The reset below lands a render later; until then a trim made for another width doesn't apply.
    const px = trim.width === width ? trim.px : 0;
    loadFlint()
      .then(({ buildFlintSpec }) => {
        if (cancelled) return;
        const spec = buildFlintSpec(panel, rows, semantics, { width, height }, theme, px);
        setBuilt({ spec, width, trim: px });
      })
      .catch((e: unknown) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, [panel, rows, semantics, width, height, theme, trim.px, trim.width]);

  // Flint can draw wider than the panel (a heatmap's colour key beside fixed-size cells). Measure
  // the drawn chart and rebuild with the overflow trimmed from its bands, at most MAX_FITS times.
  // Only banded charts above the minimum band can be narrowed; anything else is left as drawn.
  const onRendered = useCallback(
    (drawn: RenderedSize) => {
      if (!built || built.width !== latestWidth.current) return;
      const over = drawn.width - built.width;
      const step = bandStep(built.spec as { width?: unknown });
      if (over < 1 || step === undefined || step <= MIN_BAND_STEP) return;
      setTrim((t) =>
        t.tries >= MAX_FITS
          ? t
          : { px: built.trim + Math.ceil(over), tries: t.tries + 1, width: built.width },
      );
    },
    [built],
  );

  if (error) throw new Error(error);
  return (
    <div ref={ref} className="chart-fill">
      {built && <VegaView spec={built.spec} onData={onData} onRendered={onRendered} />}
    </div>
  );
}
