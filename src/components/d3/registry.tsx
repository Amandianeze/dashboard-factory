import type { ComponentType } from 'react';
import type { z } from 'zod';
import type { Row } from '../../data/transforms';
import { d3Catalog, type D3ChartName } from './catalog';
import { RankedBars } from './RankedBars';

export interface D3ChartProps<P> {
  data: Row[];
  /** Already validated against the catalog propsSchema (defaults applied). */
  props: P;
  width: number;
  height: number;
}

type PropsOf<N extends D3ChartName> = z.infer<(typeof d3Catalog)[N]['propsSchema']>;

/** One React component per catalog entry. TypeScript fails the build if an entry is missing. */
export const d3Registry: { [N in D3ChartName]: ComponentType<D3ChartProps<PropsOf<N>>> } = {
  RankedBars,
};
