import { useCallback, useEffect, useRef, useState } from 'react';
import type { TopLevelSpec } from 'vega-lite';
import type { OnChartData } from '../data/chartData';
import type { Row } from '../data/transforms';
import { useElementSize } from '../hooks/useElementSize';
import type { DatasetSpec, FlintPanel } from '../spec/types';
import { useTheme } from '../theme/ThemeProvider';
import { canFitHeight, canTrimWidth, NO_FIT, type Fit } from './flintFit';
import { VegaView, type RenderedSize } from './VegaView';

/** Lazy-load Flint (and its compiler) so dashboards without Flint panels never pay for it. */
let flintPromise: Promise<typeof import('./flintSpec')> | undefined;
const loadFlint = () => (flintPromise ??= import('./flintSpec'));
const MAX_FITS = 3;
const NO_STATE = { fit: NO_FIT, tries: 0, width: 0, height: 0 };

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
  // A spec remembers the box and fit it was built for, so a late or repeated render report can't
  // count the same misfit twice or apply an old box's fit to a new one.
  const [built, setBuilt] = useState<{
    spec: TopLevelSpec;
    width: number;
    height: number;
    fit: Fit;
  }>();
  const [state, setState] = useState(NO_STATE);
  const [error, setError] = useState<string>();
  const latest = useRef({ width, height });
  latest.current = { width, height };
  useEffect(() => setState(NO_STATE), [panel, rows, semantics, width, height, theme]);

  // The reset above lands a render later; until then a fit made for another box doesn't apply.
  const current = state.width === width && state.height === height ? state.fit : NO_FIT;
  const { trimWidth, growHeight } = current;

  useEffect(() => {
    if (!width || !height) return;
    let cancelled = false;
    const fit = { trimWidth, growHeight };
    loadFlint()
      .then(({ buildFlintSpec }) => {
        if (cancelled) return;
        const spec = buildFlintSpec(panel, rows, semantics, { width, height }, theme, fit);
        setBuilt({ spec, width, height, fit });
      })
      .catch((e: unknown) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, [panel, rows, semantics, width, height, theme, trimWidth, growHeight]);

  // Measure the drawn chart against its box and rebuild once more if it is wider (trim the width:
  // bands or the continuous plot) or shorter or taller (fit the continuous plot's height), at most
  // MAX_FITS times. Charts that fit, or can't be adjusted, are drawn once.
  const onRendered = useCallback(
    (drawn: RenderedSize) => {
      if (!built || built.width !== latest.current.width || built.height !== latest.current.height)
        return;
      const spec = built.spec as Parameters<typeof canTrimWidth>[0];
      const over = drawn.width - built.width;
      const under = built.height - drawn.height;
      const fit = { ...built.fit };
      if (over >= 1 && canTrimWidth(spec)) fit.trimWidth += Math.ceil(over);
      if (Math.abs(under) >= 2 && canFitHeight(spec)) fit.growHeight += Math.floor(under);
      if (fit.trimWidth === built.fit.trimWidth && fit.growHeight === built.fit.growHeight) return;
      setState((s) =>
        s.tries >= MAX_FITS
          ? s
          : { fit, tries: s.tries + 1, width: built.width, height: built.height },
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
