/**
 * Dashboard Spec — the single source of truth for every dashboard.
 *
 * A dashboard is a YAML file in /dashboards validated by this schema. Code is generated or written
 * *from* specs; never the other way round. When you change this file, run `npm run spec:schema`
 * to regenerate dashboards/dashboard.schema.json (editor autocomplete) and `npm run spec:validate`.
 */
import { z } from 'zod';
import { D3FormatString } from './d3Format';

export const ID_PATTERN = /^[a-z][a-z0-9_-]*$/;
const Id = z
  .string()
  .regex(ID_PATTERN, 'ids are lowercase, start with a letter, and use only a-z 0-9 _ -');

/* ------------------------------------------------------------------ datasets */

export const FieldType = z.enum(['quantitative', 'temporal', 'nominal', 'ordinal']);
export type FieldType = z.infer<typeof FieldType>;

const Fields = z
  .record(FieldType)
  .refine((f) => Object.keys(f).length > 0, 'declare at least one field');

const DatasetCommon = {
  description: z.string().optional(),
  /** Every field a panel may reference. Panels referencing undeclared fields fail validation. */
  fields: Fields,
};

export const DatasetSpec = z.discriminatedUnion('source', [
  z
    .object({
      source: z.literal('fixture'),
      /** File name under public/data, e.g. sales_daily.json (an array of row objects). */
      path: z.string().endsWith('.json'),
      ...DatasetCommon,
    })
    .strict(),
  z
    .object({
      source: z.literal('api'),
      /** Phase 3: backend endpoint returning an array of row objects. */
      endpoint: z.string().startsWith('/'),
      ...DatasetCommon,
    })
    .strict(),
]);
export type DatasetSpec = z.infer<typeof DatasetSpec>;

/* ------------------------------------------------------------------- filters */

export const FilterSpec = z
  .object({
    id: Id,
    label: z.string().min(1),
    type: z.enum(['select', 'multiselect']),
    dataset: Id,
    field: z.string().min(1),
    /** Panel ids this filter applies to. Each must use the same dataset. */
    appliesTo: z.array(Id).min(1),
  })
  .strict();
export type FilterSpec = z.infer<typeof FilterSpec>;

/* -------------------------------------------------------------------- panels */

const PanelCommon = {
  title: z.string().min(1),
  description: z.string().optional(),
  dataset: Id,
};

export const KpiPanel = z
  .object({
    ...PanelCommon,
    renderer: z.literal('kpi'),
    field: z.string().min(1),
    aggregate: z.enum(['sum', 'mean', 'min', 'max', 'count', 'distinct']),
    /** d3-format specifier, e.g. "$,.0f" or ".1%". */
    format: D3FormatString.default(',.0f'),
  })
  .strict();

export const VegaLitePanel = z
  .object({
    ...PanelCommon,
    renderer: z.literal('vega-lite'),
    /** A Vega-Lite spec WITHOUT `data`, `width` or `height` — the runtime injects those. */
    spec: z
      .record(z.unknown())
      .refine((s) => !('data' in s), 'omit `data`; the runtime injects the panel dataset')
      .refine(
        (s) => !('width' in s) && !('height' in s),
        'omit `width`/`height`; panels size to their layout cell',
      ),
  })
  .strict();

export const D3Panel = z
  .object({
    ...PanelCommon,
    renderer: z.literal('d3'),
    /** Name of a chart in src/components/d3/catalog.ts. */
    component: z.string().min(1),
    /** Validated against that chart's propsSchema. */
    props: z.record(z.unknown()).default({}),
  })
  .strict();

export const PlotlyPanel = z
  .object({
    ...PanelCommon,
    renderer: z.literal('plotly'),
    trace: z
      .object({
        /** Limited to what plotly.js-basic-dist-min ships (keeps the bundle small). */
        type: z.enum(['scatter', 'bar']),
        x: z.string().min(1),
        y: z.string().min(1),
        /** Split into one trace per distinct value of this field. */
        groupBy: z.string().optional(),
        /** Aggregate y per x (and group) before plotting. Omit to plot raw rows. */
        aggregate: z.enum(['sum', 'mean']).optional(),
        mode: z.enum(['markers', 'lines', 'lines+markers']).optional(),
      })
      .strict(),
    layout: z.record(z.unknown()).default({}),
  })
  .strict();

export const PanelSpec = z.discriminatedUnion('renderer', [
  KpiPanel,
  VegaLitePanel,
  D3Panel,
  PlotlyPanel,
]);
export type PanelSpec = z.infer<typeof PanelSpec>;
export type Renderer = PanelSpec['renderer'];

/* -------------------------------------------------------------------- layout */

export const LayoutCell = z
  .object({
    panel: Id,
    /** Columns out of 12. */
    span: z.number().int().min(1).max(12),
  })
  .strict();

export const LayoutRow = z
  .object({
    /** Row height in px on desktop. */
    height: z.number().int().min(80).max(900).default(320),
    cells: z.array(LayoutCell).min(1),
  })
  .strict()
  .refine((r) => r.cells.reduce((n, c) => n + c.span, 0) <= 12, 'row spans must total 12 or less');

/* ----------------------------------------------------------------- dashboard */

const DashboardObject = z
  .object({
    version: z.literal(1),
    id: Id,
    title: z.string().min(1),
    description: z.string().optional(),
    datasets: z.record(DatasetSpec),
    filters: z.array(FilterSpec).default([]),
    layout: z.object({ rows: z.array(LayoutRow).min(1) }).strict(),
    panels: z.record(PanelSpec),
  })
  .strict();

type DashboardShape = z.infer<typeof DashboardObject>;

/** Collect every `field` referenced in a Vega-Lite spec, minus fields created by transforms. */
export function vegaLiteFieldRefs(spec: Record<string, unknown>): {
  used: string[];
  derived: string[];
} {
  const used = new Set<string>();
  const derived = new Set<string>();
  const walk = (node: unknown, key?: string) => {
    if (Array.isArray(node)) return node.forEach((n) => walk(n, key));
    if (!node || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node)) {
      if (k === 'field' && typeof v === 'string') used.add(v.split('.')[0]!);
      else if (k === 'as' && key === 'transform') {
        (Array.isArray(v) ? v : [v]).forEach((a) => typeof a === 'string' && derived.add(a));
      } else walk(v, k === 'transform' ? 'transform' : key);
    }
  };
  walk(spec);
  return { used: [...used], derived: [...derived] };
}

function crossReferences(d: DashboardShape, ctx: z.RefinementCtx) {
  const issue = (path: (string | number)[], message: string) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });

  for (const key of Object.keys(d.datasets))
    if (!ID_PATTERN.test(key)) issue(['datasets', key], `invalid dataset id "${key}"`);
  for (const key of Object.keys(d.panels))
    if (!ID_PATTERN.test(key)) issue(['panels', key], `invalid panel id "${key}"`);

  // Layout: every cell points at a panel, every panel is placed exactly once.
  const placed = new Map<string, number>();
  d.layout.rows.forEach((row, r) =>
    row.cells.forEach((cell, c) => {
      if (!d.panels[cell.panel])
        issue(['layout', 'rows', r, 'cells', c, 'panel'], `unknown panel "${cell.panel}"`);
      placed.set(cell.panel, (placed.get(cell.panel) ?? 0) + 1);
    }),
  );
  for (const id of Object.keys(d.panels)) {
    const n = placed.get(id) ?? 0;
    if (n === 0) issue(['panels', id], `panel "${id}" is not placed in layout.rows`);
    if (n > 1) issue(['panels', id], `panel "${id}" is placed ${n} times`);
  }

  // Panels: dataset exists and every referenced field is declared.
  for (const [id, p] of Object.entries(d.panels)) {
    const ds = d.datasets[p.dataset];
    if (!ds) {
      issue(['panels', id, 'dataset'], `unknown dataset "${p.dataset}"`);
      continue;
    }
    const has = (f: string) => f in ds.fields;
    const need = (path: (string | number)[], f: string | undefined) => {
      if (f !== undefined && !has(f))
        issue(['panels', id, ...path], `field "${f}" is not declared in dataset "${p.dataset}"`);
    };
    switch (p.renderer) {
      case 'kpi':
        if (p.aggregate !== 'count') need(['field'], p.field);
        if (
          ['sum', 'mean'].includes(p.aggregate) &&
          has(p.field) &&
          ds.fields[p.field] !== 'quantitative'
        )
          issue(['panels', id, 'aggregate'], `"${p.aggregate}" needs a quantitative field`);
        break;
      case 'plotly':
        need(['trace', 'x'], p.trace.x);
        need(['trace', 'y'], p.trace.y);
        need(['trace', 'groupBy'], p.trace.groupBy);
        break;
      case 'vega-lite': {
        const { used, derived } = vegaLiteFieldRefs(p.spec);
        used.filter((f) => !derived.includes(f)).forEach((f) => need(['spec'], f));
        break;
      }
      case 'd3':
        break; // props are checked against the chart catalog in validate.ts
    }
  }

  // Filters: dataset + field exist, targets exist and share the dataset.
  const filterIds = new Set<string>();
  d.filters.forEach((f, i) => {
    if (filterIds.has(f.id)) issue(['filters', i, 'id'], `duplicate filter id "${f.id}"`);
    filterIds.add(f.id);
    const ds = d.datasets[f.dataset];
    if (!ds) return issue(['filters', i, 'dataset'], `unknown dataset "${f.dataset}"`);
    if (!(f.field in ds.fields))
      issue(['filters', i, 'field'], `field "${f.field}" is not declared in "${f.dataset}"`);
    f.appliesTo.forEach((pid, j) => {
      const p = d.panels[pid];
      if (!p) issue(['filters', i, 'appliesTo', j], `unknown panel "${pid}"`);
      else if (p.dataset !== f.dataset)
        issue(
          ['filters', i, 'appliesTo', j],
          `panel "${pid}" uses dataset "${p.dataset}", not "${f.dataset}"`,
        );
    });
  });
}

export const DashboardSpec = DashboardObject.superRefine(crossReferences);
export type DashboardSpec = z.infer<typeof DashboardSpec>;
