/** Convenience type exports derived from the Zod schema. Never hand-write spec types. */
import type { z } from 'zod';
import type {
  D3Panel as D3PanelSchema,
  KpiPanel as KpiPanelSchema,
  PlotlyPanel as PlotlyPanelSchema,
  VegaLitePanel as VegaLitePanelSchema,
} from './schema';

export type {
  DashboardSpec,
  DatasetSpec,
  FieldType,
  FilterSpec,
  PanelSpec,
  Renderer,
} from './schema';
export type KpiPanel = z.infer<typeof KpiPanelSchema>;
export type VegaLitePanel = z.infer<typeof VegaLitePanelSchema>;
export type D3Panel = z.infer<typeof D3PanelSchema>;
export type PlotlyPanel = z.infer<typeof PlotlyPanelSchema>;
