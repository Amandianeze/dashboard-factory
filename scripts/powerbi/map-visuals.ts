/** Map PBIR visuals and slicers into DashboardSpec panels, filters, and dataset column declarations. */
import type { FieldType, FilterSpec, PanelSpec } from '../../src/spec/schema';
import type { TableColumn } from '../../docs/lld/data-table.props';
import { classifyDaxMeasure } from './parse-dax';
import { findMeasure } from './parse-tmdl';
import {
  inferFlintSemantic,
  mapPowerBiFormat,
  mapTmdlDataType,
  type FormatMapping,
} from './map-format';
import { mapPixelsToGrid, type PlacedPanel } from './map-layout';
import type {
  AggregateOp,
  DatasetColumnSpec,
  ImportReport,
  PbirPage,
  PbirProjection,
  PbirVisual,
  TmdlModel,
} from './types';

const CHROME_TYPES = new Set([
  'shape',
  'actionButton',
  'image',
  'textbox',
  'bookmarkNavigator',
  'pageNavigator',
  'visualGroup',
]);

const MAP_TYPES = new Set(['azureMap', 'shapeMap', 'map', 'filledMap']);
const SLICER_TYPES = new Set(['slicer', 'listSlicer', 'advancedSlicerVisual', 'textSlicer']);

/** Built-in Power BI visual types we recognize (others are treated as custom visuals). */
const KNOWN_VISUAL_TYPES = new Set([
  ...CHROME_TYPES,
  ...MAP_TYPES,
  ...SLICER_TYPES,
  'card',
  'cardVisual',
  'multiRowCard',
  'tableEx',
  'pivotTable',
  'lineChart',
  'areaChart',
  'stackedAreaChart',
  'clusteredColumnChart',
  'columnChart',
  'hundredPercentStackedColumnChart',
  'clusteredBarChart',
  'barChart',
  'hundredPercentStackedBarChart',
  'scatterChart',
  'donutChart',
  'pieChart',
  'lineClusteredColumnComboChart',
  'lineStackedColumnComboChart',
  'waterfallChart',
  'ribbonChart',
  'funnel',
  'treemap',
  'gauge',
  'kpi',
  'decompositionTreeVisual',
]);

/** Convert arbitrary label text into a schema-valid lowercase identifier (`/^[a-z][a-z0-9_-]*$/`). */
export function toValidId(raw: string, fallback = 'item'): string {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!slug) return fallback;
  return /^[a-z]/.test(slug) ? slug : `${fallback}_${slug}`;
}

export function toDashboardId(raw: string): string {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) return 'imported-dashboard';
  return /^[a-z]/.test(slug) ? slug : `pbi-${slug}`;
}

function makeUniqueId(base: string, used: Set<string>, fallback = 'panel'): string {
  const clean = toValidId(base, fallback);
  if (!used.has(clean)) {
    used.add(clean);
    return clean;
  }
  let n = 2;
  while (used.has(`${clean}_${n}`)) n++;
  const next = `${clean}_${n}`;
  used.add(next);
  return next;
}

/** Power BI Aggregation Function codes (0=Sum, 1=Avg, 2=DistinctCount, 3=Min, 4=Max, 5=Count). */
function mapPbiAggFn(fn?: number): AggregateOp {
  switch (fn) {
    case 1:
      return 'mean';
    case 2:
      return 'distinct';
    case 3:
      return 'min';
    case 4:
      return 'max';
    case 5:
      return 'count';
    default:
      return 'sum';
  }
}

/** Find tables reachable via active relationships from a starting table. */
export function computeConnectedTables(model: TmdlModel, seedTable?: string): Set<string> {
  const active = model.relationships.filter((r) => r.isActive);
  if (!seedTable) return new Set();
  const visited = new Set<string>([seedTable]);
  const queue = [seedTable];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const rel of active) {
      if (rel.fromTable === cur && !visited.has(rel.toTable)) {
        visited.add(rel.toTable);
        queue.push(rel.toTable);
      } else if (rel.toTable === cur && !visited.has(rel.fromTable)) {
        visited.add(rel.fromTable);
        queue.push(rel.fromTable);
      }
    }
  }
  return visited;
}

/** Pick the primary fact table from active M:1 relationships (most outgoing many-to-one links). */
export function detectPrimaryFactTable(model: TmdlModel): string | undefined {
  const scores = new Map<string, number>();
  for (const rel of model.relationships) {
    if (!rel.isActive) continue;
    if (rel.fromCardinality === 'many' && rel.toCardinality === 'one') {
      scores.set(rel.fromTable, (scores.get(rel.fromTable) ?? 0) + 1);
    }
  }
  // Prefer fact-named tables on ties
  const ranked = [...scores.entries()].sort((a, b) => {
    const aFact = /^fct|^fact|sales/i.test(a[0]) ? 1 : 0;
    const bFact = /^fct|^fact|sales/i.test(b[0]) ? 1 : 0;
    return b[1] - a[1] || bFact - aFact || a[0].localeCompare(b[0]);
  });
  if (ranked[0]) return ranked[0][0];

  // Fallback: first non-hidden table with numeric columns
  for (const t of model.tables.values()) {
    if (t.isHidden || t.isCalculationGroup) continue;
    for (const c of t.columns.values()) {
      if (c.dataType === 'double' || c.dataType === 'decimal' || c.dataType === 'int64') {
        return t.name;
      }
    }
  }
  return [...model.tables.keys()][0];
}

interface ResolvedField {
  field: string;
  label: string;
  type: FieldType;
  aggregate?: AggregateOp;
  format: FormatMapping;
  isPlaceholderMeasure?: boolean;
  sourceLabel: string;
}

class FieldRegistry {
  readonly columns = new Map<string, DatasetColumnSpec>();
  private readonly sourceToField = new Map<string, string>();
  private readonly usedFields = new Set<string>();

  registerColumn(
    table: string,
    column: string,
    type: FieldType,
    formatString?: string,
    opts?: { isPlaceholderMeasure?: boolean; signed?: boolean },
  ): string {
    const key = `${table}::${column}`;
    const existing = this.sourceToField.get(key);
    if (existing) return existing;

    const field = makeUniqueId(column, this.usedFields, 'col');
    this.sourceToField.set(key, field);
    this.columns.set(field, {
      field,
      type,
      sourceTable: table,
      sourceColumn: column,
      formatString,
      isPlaceholderMeasure: opts?.isPlaceholderMeasure,
      signed: opts?.signed,
    });
    return field;
  }
}

function cleanLabel(name: string): string {
  return name.replace(/^_+/, '').replace(/\s+/g, ' ').trim() || name;
}

export interface PageMappingResult {
  datasetId: string;
  primaryFactTable?: string;
  columns: Map<string, DatasetColumnSpec>;
  fields: Record<string, FieldType>;
  semantics: Record<string, string | { semanticType: string; unit?: string }>;
  filters: FilterSpec[];
  panels: Record<string, PanelSpec>;
  layout: { rows: ReturnType<typeof mapPixelsToGrid> };
  report: ImportReport;
}

/** Map a single PBIR page + TMDL model into DashboardSpec components and an ImportReport. */
export function mapPageToDashboard(
  page: PbirPage,
  model: TmdlModel,
  opts: { sourcePbip: string; dashboardId: string },
): PageMappingResult {
  const report: ImportReport = {
    sourcePbip: opts.sourcePbip,
    pageId: page.id,
    pageName: page.displayName,
    canvas: { width: page.width, height: page.height },
    dashboardId: opts.dashboardId,
    mapped: [],
    approximated: [],
    skipped: [],
    validationErrors: [],
  };

  const primaryFactTable = detectPrimaryFactTable(model);
  const connectedTables = computeConnectedTables(model, primaryFactTable);
  const datasetId = primaryFactTable ? toValidId(primaryFactTable, 'dataset') : 'dataset';
  const registry = new FieldRegistry();
  const fieldFormats = new Map<string, FormatMapping>();

  const panels: Record<string, PanelSpec> = {};
  const placed: PlacedPanel[] = [];
  const usedPanelIds = new Set<string>();
  const pendingSlicers: Array<{ visual: PbirVisual; proj: PbirProjection }> = [];
  const loggedMeasures = new Set<string>();

  /** Resolve a Column or Aggregation projection into a dataset field. */
  const resolveColumnProj = (proj: PbirProjection): ResolvedField | null => {
    if (!proj.entity || !proj.property) return null;
    const tDef = model.tables.get(proj.entity);
    const cDef = tDef?.columns.get(proj.property);
    const fieldType = cDef ? mapTmdlDataType(cDef.dataType) : 'nominal';
    const fmt = mapPowerBiFormat(cDef?.formatString);
    const field = registry.registerColumn(
      proj.entity,
      proj.property,
      fieldType,
      cDef?.formatString,
    );
    fieldFormats.set(field, fmt);
    return {
      field,
      label: proj.displayName ?? cleanLabel(proj.property),
      type: fieldType,
      aggregate: proj.kind === 'Aggregation' ? mapPbiAggFn(proj.aggregationFn) : undefined,
      format: fmt,
      sourceLabel: `${proj.entity}[${proj.property}]`,
    };
  };

  /** Resolve a Measure projection into a dataset field + aggregate (or null if skipped). */
  const resolveMeasureProj = (
    proj: PbirProjection,
    allowPlaceholderFallback: boolean,
  ): ResolvedField | null => {
    const mName = proj.property ?? proj.queryRef;
    const measure = findMeasure(model, mName, proj.entity);
    const sourceKey = `${proj.entity ?? measure?.table ?? '?'}.${mName}`;

    if (!measure) {
      if (!loggedMeasures.has(sourceKey)) {
        loggedMeasures.add(sourceKey);
        report.skipped.push({
          category: 'measure',
          source: sourceKey,
          detail: 'measure definition not found in TMDL model',
        });
      }
      return null;
    }

    const cls = classifyDaxMeasure(measure, model);
    const fmt = mapPowerBiFormat(measure.formatString, measure.hasDynamicFormat);

    if (cls.kind === 'placeholder') {
      if (!loggedMeasures.has(sourceKey)) {
        loggedMeasures.add(sourceKey);
        report.skipped.push({
          category: 'measure',
          source: sourceKey,
          detail: cls.reason,
        });
      }
      return null;
    }

    if (cls.kind === 'simple' || cls.kind === 'unit-scaled') {
      const colDef = model.tables.get(cls.table)?.columns.get(cls.column);
      const colType = colDef ? mapTmdlDataType(colDef.dataType) : 'quantitative';
      const field = registry.registerColumn(
        cls.table,
        cls.column,
        colType === 'nominal' ? 'nominal' : 'quantitative',
        measure.formatString ?? colDef?.formatString,
        { signed: fmt.signed },
      );
      fieldFormats.set(field, fmt);

      if (!loggedMeasures.has(sourceKey)) {
        loggedMeasures.add(sourceKey);
        if (cls.kind === 'simple') {
          report.mapped.push({
            category: 'measure',
            source: sourceKey,
            target: `${cls.aggregate}(${field})`,
            detail: `simple DAX aggregate mapped directly`,
          });
        } else {
          report.approximated.push({
            category: 'measure',
            source: sourceKey,
            target: `${cls.aggregate}(${field})`,
            detail: cls.reason,
          });
        }
        if (fmt.approximated && fmt.note) {
          report.approximated.push({
            category: 'format',
            source: sourceKey,
            target: fmt.d3Format,
            detail: fmt.note,
          });
        }
      }

      return {
        field,
        label: proj.displayName ?? cleanLabel(measure.name),
        type: 'quantitative',
        aggregate: cls.aggregate,
        format: fmt,
        sourceLabel: sourceKey,
      };
    }

    // Complex DAX
    if (!allowPlaceholderFallback || !cls.tracedTable) {
      if (!loggedMeasures.has(sourceKey)) {
        loggedMeasures.add(sourceKey);
        report.skipped.push({
          category: 'measure',
          source: sourceKey,
          detail: `complex DAX (${cls.reason}): ${cls.expression}`,
        });
      }
      return null;
    }

    // Visual has ONLY complex DAX measures, but we traced a fact table: emit placeholder field
    const field = registry.registerColumn(
      cls.tracedTable,
      measure.name,
      'quantitative',
      measure.formatString,
      {
        isPlaceholderMeasure: true,
        signed: fmt.signed || /var|diff|delta|change/i.test(measure.name),
      },
    );
    fieldFormats.set(field, fmt);
    if (!loggedMeasures.has(sourceKey)) {
      loggedMeasures.add(sourceKey);
      report.approximated.push({
        category: 'measure',
        source: sourceKey,
        target: `sum(${field}) [placeholder]`,
        detail: `complex DAX (${cls.reason}) bound to synthetic placeholder column: ${cls.expression}`,
      });
    }
    return {
      field,
      label: proj.displayName ?? cleanLabel(measure.name),
      type: 'quantitative',
      aggregate: 'sum',
      format: fmt,
      isPlaceholderMeasure: true,
      sourceLabel: sourceKey,
    };
  };

  /** Resolve a list of value projections: prefer real mapped measures; fall back to placeholder only if none mapped. */
  const resolveValueProjections = (projs: PbirProjection[]): ResolvedField[] => {
    const mapped: ResolvedField[] = [];
    const complexCandidates: PbirProjection[] = [];

    for (const p of projs) {
      if (p.kind === 'Column' || p.kind === 'Aggregation') {
        const r = resolveColumnProj(p);
        if (r) mapped.push(r);
      } else if (p.kind === 'Measure') {
        const r = resolveMeasureProj(p, false);
        if (r) mapped.push(r);
        else complexCandidates.push(p);
      } else {
        report.skipped.push({
          category: 'measure',
          source: p.queryRef || p.kind,
          detail: `inline ${p.kind} projection is unsupported in v1`,
        });
      }
    }

    if (mapped.length > 0) return mapped;

    // Fallback: try tracing complex measures so visual still renders structurally
    for (const p of complexCandidates) {
      const r = resolveMeasureProj(p, true);
      if (r) mapped.push(r);
    }
    return mapped;
  };

  // Sort visuals deterministically (top-to-bottom, left-to-right, then id)
  const visuals = [...page.visuals].sort(
    (a, b) =>
      a.position.y - b.position.y || a.position.x - b.position.x || a.id.localeCompare(b.id),
  );

  for (const vis of visuals) {
    const label = vis.title ? `${vis.visualType} "${vis.title}"` : `${vis.visualType} (${vis.id})`;

    if (vis.isHidden) {
      report.skipped.push({
        category: 'visual',
        source: label,
        detail: 'hidden visual (isHidden: true)',
      });
      continue;
    }
    if (CHROME_TYPES.has(vis.visualType) || vis.isGroup) {
      report.skipped.push({
        category: 'visual',
        source: label,
        detail: 'decorative chrome / navigation visual',
      });
      continue;
    }
    if (MAP_TYPES.has(vis.visualType)) {
      report.skipped.push({
        category: 'visual',
        source: label,
        detail: 'map visuals are unsupported (Flint maps require external CDN topologies)',
      });
      continue;
    }
    if (!KNOWN_VISUAL_TYPES.has(vis.visualType)) {
      report.skipped.push({
        category: 'visual',
        source: label,
        detail: `custom visual "${vis.visualType}" is unsupported`,
      });
      continue;
    }

    // Slicers collected for post-pass once panels exist
    if (SLICER_TYPES.has(vis.visualType)) {
      const valProj = vis.projections.find((p) => p.kind === 'Column' && p.bucket !== 'Tooltips');
      if (!valProj) {
        report.skipped.push({
          category: 'slicer',
          source: label,
          detail: 'slicer has no column projection',
        });
      } else {
        pendingSlicers.push({ visual: vis, proj: valProj });
      }
      continue;
    }

    const byBucket = (names: string[]) => vis.projections.filter((p) => names.includes(p.bucket));

    // ---- KPI cards ----
    if (vis.visualType === 'card' || vis.visualType === 'cardVisual') {
      const vals = resolveValueProjections(byBucket(['Data', 'Values']));
      const primary = vals[0];
      if (!primary) {
        report.skipped.push({
          category: 'visual',
          source: label,
          detail: 'no mappable measure on KPI card',
        });
        continue;
      }
      const title =
        vis.title && !/^title placeholder$/i.test(vis.title) ? vis.title : primary.label;
      const panelId = makeUniqueId(title, usedPanelIds, 'kpi');
      panels[panelId] = {
        title,
        dataset: datasetId,
        kind: 'kpi-card',
        renderer: 'kpi',
        field: primary.field,
        aggregate: primary.aggregate ?? 'sum',
        format: primary.format.d3Format,
      };
      placed.push({ panelId, kind: 'kpi-card', position: vis.position, title });
      report.mapped.push({
        category: 'visual',
        source: label,
        target: `${panelId} (kpi)`,
        detail: `${primary.aggregate ?? 'sum'}(${primary.field}) format=${primary.format.d3Format}`,
      });
      if (vals.length > 1) {
        report.approximated.push({
          category: 'visual',
          source: label,
          target: panelId,
          detail: `multi-measure cardVisual reduced to primary measure "${primary.label}" (${vals.length - 1} extra dropped)`,
        });
      }
      continue;
    }

    // ---- Tables & Matrices ----
    if (vis.visualType === 'tableEx' || vis.visualType === 'pivotTable') {
      const rowProjs = byBucket(['Rows', 'Columns']).filter((p) => p.kind === 'Column');
      const valProjs = byBucket(['Values']);
      const dimFields = rowProjs
        .map(resolveColumnProj)
        .filter((x): x is ResolvedField => x !== null);
      const measureFields = resolveValueProjections(valProjs);

      const allCols = [...dimFields, ...measureFields];
      const seenFields = new Set<string>();
      const columns: TableColumn[] = [];
      for (const f of allCols) {
        if (seenFields.has(f.field)) continue;
        seenFields.add(f.field);
        const col: TableColumn = { field: f.field, label: f.label };
        if (f.type === 'quantitative') {
          col.format = f.format.d3Format;
          if (f.format.signed) col.conditional = 'sign';
        }
        columns.push(col);
      }

      if (columns.length === 0) {
        report.skipped.push({
          category: 'visual',
          source: label,
          detail: 'no mappable columns on table/matrix',
        });
        continue;
      }

      const defaultTitle = dimFields[0] ? `Breakdown by ${dimFields[0].label}` : 'Data table';
      const title =
        vis.title && !/^(title placeholder|matrix table|regular table)$/i.test(vis.title)
          ? vis.title
          : vis.title || defaultTitle;
      const panelId = makeUniqueId(title, usedPanelIds, 'table');
      const firstNum = columns.find((c) => c.format !== undefined);

      panels[panelId] = {
        title,
        dataset: datasetId,
        kind: 'data-table',
        renderer: 'table',
        columns,
        ...(firstNum ? { sort: { field: firstNum.field, order: 'desc' as const } } : {}),
        limit: 50,
      };
      placed.push({ panelId, kind: 'data-table', position: vis.position, title });

      if (vis.visualType === 'pivotTable') {
        report.approximated.push({
          category: 'visual',
          source: label,
          target: `${panelId} (table)`,
          detail: `pivotTable flattened to ${columns.length}-column data-table`,
        });
      } else {
        report.mapped.push({
          category: 'visual',
          source: label,
          target: `${panelId} (table)`,
          detail: `${columns.length} columns`,
        });
      }
      continue;
    }

    // ---- Waterfall Chart (Flint) ----
    if (vis.visualType === 'waterfallChart') {
      const catProj = byBucket(['Category', 'Breakdown']).find((p) => p.kind === 'Column');
      const vals = resolveValueProjections(byBucket(['Y']));
      const cat = catProj ? resolveColumnProj(catProj) : null;
      const val = vals[0];
      if (!cat || !val) {
        report.skipped.push({
          category: 'visual',
          source: label,
          detail: 'waterfallChart missing mappable Category or Y measure',
        });
        continue;
      }
      const title = vis.title || `${val.label} by ${cat.label}`;
      const panelId = makeUniqueId(title, usedPanelIds, 'waterfall');
      panels[panelId] = {
        title,
        dataset: datasetId,
        kind: 'chart-panel',
        renderer: 'flint',
        chart: {
          chartType: 'Waterfall Chart',
          encodings: {
            x: cat.field,
            y: { field: val.field, aggregate: val.aggregate ?? 'sum' },
          },
        },
      };
      placed.push({ panelId, kind: 'chart-panel', position: vis.position, title });
      const hasBreakdown = byBucket(['Breakdown']).length > 0;
      if (hasBreakdown) {
        report.approximated.push({
          category: 'visual',
          source: label,
          target: `${panelId} (flint Waterfall Chart)`,
          detail: 'mapped to Flint Waterfall Chart; sub-breakdown bucket omitted',
        });
      } else {
        report.mapped.push({
          category: 'visual',
          source: label,
          target: `${panelId} (flint Waterfall Chart)`,
          detail: `x=${cat.field}, y=${val.aggregate ?? 'sum'}(${val.field})`,
        });
      }
      continue;
    }

    // ---- Scatter Chart (Vega-Lite) ----
    if (vis.visualType === 'scatterChart') {
      const xs = resolveValueProjections(byBucket(['X']));
      const ys = resolveValueProjections(byBucket(['Y']));
      const catProj = byBucket(['Category']).find((p) => p.kind === 'Column');
      const seriesProj = byBucket(['Series']).find((p) => p.kind === 'Column');
      const xF = xs[0];
      const yF = ys[0];
      if (!xF || !yF) {
        report.skipped.push({
          category: 'visual',
          source: label,
          detail: 'scatterChart missing mappable X or Y measure',
        });
        continue;
      }
      const cat = catProj ? resolveColumnProj(catProj) : null;
      const series = seriesProj ? resolveColumnProj(seriesProj) : null;
      const title = vis.title || `${yF.label} vs ${xF.label}`;
      const panelId = makeUniqueId(title, usedPanelIds, 'scatter');

      const tooltip: Array<Record<string, unknown>> = [];
      if (cat) tooltip.push({ field: cat.field, type: cat.type, title: cat.label });
      if (series && series.field !== cat?.field) {
        tooltip.push({ field: series.field, type: series.type, title: series.label });
      }
      tooltip.push({
        field: xF.field,
        aggregate: xF.aggregate ?? 'sum',
        type: 'quantitative',
        title: xF.label,
        format: xF.format.d3Format,
      });
      tooltip.push({
        field: yF.field,
        aggregate: yF.aggregate ?? 'sum',
        type: 'quantitative',
        title: yF.label,
        format: yF.format.d3Format,
      });

      const encoding: Record<string, unknown> = {
        x: {
          field: xF.field,
          aggregate: xF.aggregate ?? 'sum',
          type: 'quantitative',
          title: xF.label,
        },
        y: {
          field: yF.field,
          aggregate: yF.aggregate ?? 'sum',
          type: 'quantitative',
          title: yF.label,
        },
        ...(cat ? { detail: { field: cat.field, type: cat.type } } : {}),
        ...(series ? { color: { field: series.field, type: 'nominal', title: null } } : {}),
        tooltip,
      };

      panels[panelId] = {
        title,
        dataset: datasetId,
        kind: 'chart-panel',
        renderer: 'vega-lite',
        spec: { mark: { type: 'point', filled: true }, encoding },
      };
      placed.push({ panelId, kind: 'chart-panel', position: vis.position, title });
      report.mapped.push({
        category: 'visual',
        source: label,
        target: `${panelId} (vega-lite scatter)`,
        detail: `x=${xF.field}, y=${yF.field}${cat ? `, detail=${cat.field}` : ''}`,
      });
      continue;
    }

    // ---- Donut / Pie Chart (Vega-Lite arc) ----
    if (vis.visualType === 'donutChart' || vis.visualType === 'pieChart') {
      const catProj = byBucket(['Category', 'Series']).find((p) => p.kind === 'Column');
      const vals = resolveValueProjections(byBucket(['Y', 'Values']));
      const cat = catProj ? resolveColumnProj(catProj) : null;
      const val = vals[0];
      if (!cat || !val) {
        report.skipped.push({
          category: 'visual',
          source: label,
          detail: `${vis.visualType} missing category or value`,
        });
        continue;
      }
      const title = vis.title || `${val.label} by ${cat.label}`;
      const panelId = makeUniqueId(title, usedPanelIds, 'share');
      panels[panelId] = {
        title,
        dataset: datasetId,
        kind: 'chart-panel',
        renderer: 'vega-lite',
        spec: {
          mark:
            vis.visualType === 'donutChart' ? { type: 'arc', innerRadius: 50 } : { type: 'arc' },
          encoding: {
            theta: { field: val.field, aggregate: val.aggregate ?? 'sum', type: 'quantitative' },
            color: { field: cat.field, type: 'nominal', title: null },
            tooltip: [
              { field: cat.field, type: cat.type, title: cat.label },
              {
                field: val.field,
                aggregate: val.aggregate ?? 'sum',
                type: 'quantitative',
                title: val.label,
                format: val.format.d3Format,
              },
            ],
          },
        },
      };
      placed.push({ panelId, kind: 'chart-panel', position: vis.position, title });
      report.mapped.push({
        category: 'visual',
        source: label,
        target: `${panelId} (vega-lite arc)`,
        detail: `theta=${val.field}, color=${cat.field}`,
      });
      continue;
    }

    // ---- Cartesian charts: line, area, column, bar, combo ----
    if (
      vis.visualType === 'lineChart' ||
      vis.visualType === 'areaChart' ||
      vis.visualType === 'stackedAreaChart' ||
      vis.visualType === 'clusteredColumnChart' ||
      vis.visualType === 'columnChart' ||
      vis.visualType === 'hundredPercentStackedColumnChart' ||
      vis.visualType === 'clusteredBarChart' ||
      vis.visualType === 'barChart' ||
      vis.visualType === 'hundredPercentStackedBarChart' ||
      vis.visualType === 'lineClusteredColumnComboChart' ||
      vis.visualType === 'lineStackedColumnComboChart'
    ) {
      const catProj = byBucket(['Category']).find((p) => p.kind === 'Column');
      const seriesProj = byBucket(['Series']).find((p) => p.kind === 'Column');
      const yVals = resolveValueProjections(byBucket(['Y']));
      const y2Vals = resolveValueProjections(byBucket(['Y2']));
      const cat = catProj ? resolveColumnProj(catProj) : null;

      if (!cat || (yVals.length === 0 && y2Vals.length === 0)) {
        report.skipped.push({
          category: 'visual',
          source: label,
          detail: `${vis.visualType} missing mappable Category or Y measure`,
        });
        continue;
      }

      const series = seriesProj ? resolveColumnProj(seriesProj) : null;
      const primaryY = yVals[0] ?? y2Vals[0]!;
      const title =
        vis.title && !/^title placeholder$/i.test(vis.title)
          ? vis.title
          : `${primaryY.label} by ${cat.label}`;
      const panelId = makeUniqueId(title, usedPanelIds, 'chart');

      const isHorizontal =
        vis.visualType === 'clusteredBarChart' ||
        vis.visualType === 'barChart' ||
        vis.visualType === 'hundredPercentStackedBarChart';
      const isClustered =
        vis.visualType === 'clusteredColumnChart' || vis.visualType === 'clusteredBarChart';
      const isCombo =
        vis.visualType === 'lineClusteredColumnComboChart' ||
        vis.visualType === 'lineStackedColumnComboChart';

      const markType =
        vis.visualType === 'lineChart'
          ? 'line'
          : vis.visualType === 'areaChart' || vis.visualType === 'stackedAreaChart'
            ? 'area'
            : 'bar';

      const catChannel: Record<string, unknown> = {
        field: cat.field,
        type: cat.type,
        title: null,
      };
      if (isHorizontal) {
        catChannel.sort = '-x';
      }

      let spec: Record<string, unknown>;
      const allUniqueY = [...yVals, ...y2Vals].filter(
        (v, idx, arr) => arr.findIndex((o) => o.field === v.field) === idx,
      );

      if (isCombo && yVals[0] && y2Vals[0] && yVals[0].field !== y2Vals[0].field) {
        const barM = yVals[0];
        const lineM = y2Vals[0];
        spec = {
          encoding: { x: catChannel },
          layer: [
            {
              mark: { type: 'bar' },
              encoding: {
                y: {
                  field: barM.field,
                  aggregate: barM.aggregate ?? 'sum',
                  type: 'quantitative',
                  title: barM.label,
                },
                tooltip: [
                  { field: cat.field, type: cat.type, title: cat.label },
                  {
                    field: barM.field,
                    aggregate: barM.aggregate ?? 'sum',
                    type: 'quantitative',
                    title: barM.label,
                    format: barM.format.d3Format,
                  },
                ],
              },
            },
            {
              mark: { type: 'line' },
              encoding: {
                y: {
                  field: lineM.field,
                  aggregate: lineM.aggregate ?? 'sum',
                  type: 'quantitative',
                  title: lineM.label,
                },
                tooltip: [
                  { field: cat.field, type: cat.type, title: cat.label },
                  {
                    field: lineM.field,
                    aggregate: lineM.aggregate ?? 'sum',
                    type: 'quantitative',
                    title: lineM.label,
                    format: lineM.format.d3Format,
                  },
                ],
              },
            },
          ],
          resolve: { scale: { y: 'independent' } },
        };
        report.approximated.push({
          category: 'visual',
          source: label,
          target: `${panelId} (vega-lite combo)`,
          detail: 'combo chart mapped to dual-axis Vega-Lite bar+line layer',
        });
      } else if (allUniqueY.length > 1 && !series) {
        const foldFields = allUniqueY.map((m) => m.field);
        const valAxis: Record<string, unknown> = {
          field: 'value',
          aggregate: 'sum',
          type: 'quantitative',
          title: null,
        };
        const encoding: Record<string, unknown> = isHorizontal
          ? {
              y: catChannel,
              x: valAxis,
              color: { field: 'metric', type: 'nominal', title: null },
              ...(isClustered ? { yOffset: { field: 'metric' } } : {}),
            }
          : {
              x: catChannel,
              y: valAxis,
              color: { field: 'metric', type: 'nominal', title: null },
              ...(isClustered ? { xOffset: { field: 'metric' } } : {}),
            };
        encoding.tooltip = [
          { field: cat.field, type: cat.type, title: cat.label },
          { field: 'metric', type: 'nominal', title: 'Metric' },
          {
            field: 'value',
            aggregate: 'sum',
            type: 'quantitative',
            title: 'Value',
            format: primaryY.format.d3Format,
          },
        ];
        spec = {
          transform: [{ fold: foldFields, as: ['metric', 'value'] }],
          mark: { type: markType },
          encoding,
        };
        report.mapped.push({
          category: 'visual',
          source: label,
          target: `${panelId} (vega-lite ${markType})`,
          detail: `multi-measure fold [${foldFields.join(', ')}] over ${cat.field}`,
        });
      } else {
        const valChannel: Record<string, unknown> = {
          field: primaryY.field,
          aggregate: primaryY.aggregate ?? 'sum',
          type: 'quantitative',
          title: primaryY.label,
        };
        const tooltip: Array<Record<string, unknown>> = [
          { field: cat.field, type: cat.type, title: cat.label },
        ];
        if (series && series.field !== cat.field) {
          tooltip.push({ field: series.field, type: series.type, title: series.label });
        }
        tooltip.push({
          field: primaryY.field,
          aggregate: primaryY.aggregate ?? 'sum',
          type: 'quantitative',
          title: primaryY.label,
          format: primaryY.format.d3Format,
        });

        const encoding: Record<string, unknown> = isHorizontal
          ? {
              y: catChannel,
              x: valChannel,
              ...(series
                ? {
                    color: { field: series.field, type: 'nominal', title: null },
                    ...(isClustered ? { yOffset: { field: series.field } } : {}),
                  }
                : {}),
              tooltip,
            }
          : {
              x: catChannel,
              y: valChannel,
              ...(series
                ? {
                    color: { field: series.field, type: 'nominal', title: null },
                    ...(isClustered ? { xOffset: { field: series.field } } : {}),
                  }
                : {}),
              tooltip,
            };

        spec = { mark: { type: markType }, encoding };
        report.mapped.push({
          category: 'visual',
          source: label,
          target: `${panelId} (vega-lite ${markType})`,
          detail: `${primaryY.aggregate ?? 'sum'}(${primaryY.field}) by ${cat.field}${series ? ` grouped by ${series.field}` : ''}`,
        });
      }

      panels[panelId] = {
        title,
        dataset: datasetId,
        kind: 'chart-panel',
        renderer: 'vega-lite',
        spec,
      };
      placed.push({ panelId, kind: 'chart-panel', position: vis.position, title });
      continue;
    }

    report.skipped.push({
      category: 'visual',
      source: label,
      detail: `visualType "${vis.visualType}" is not mapped in v1`,
    });
  }

  // ---- Slicers -> top-level filters (only when connected to the fact table via active relationships) ----
  const allPanelIds = Object.keys(panels);
  const filters: FilterSpec[] = [];
  const usedFilterIds = new Set<string>();
  const usedFilterFields = new Set<string>();

  for (const { visual, proj } of pendingSlicers) {
    const srcLabel = visual.title
      ? `${visual.visualType} "${visual.title}" (${proj.queryRef})`
      : `${visual.visualType} (${proj.queryRef})`;
    const entity = proj.entity;
    const property = proj.property;

    if (!entity || !property) {
      report.skipped.push({
        category: 'slicer',
        source: srcLabel,
        detail: 'missing entity/property',
      });
      continue;
    }
    if (allPanelIds.length === 0) {
      report.skipped.push({
        category: 'slicer',
        source: srcLabel,
        detail: 'no panels on page to filter',
      });
      continue;
    }
    const isConnected =
      connectedTables.size > 0 ? connectedTables.has(entity) : entity === primaryFactTable;
    if (!isConnected) {
      report.skipped.push({
        category: 'slicer',
        source: srcLabel,
        detail: `table "${entity}" is disconnected from primary fact table "${primaryFactTable ?? 'none'}" (navigation/parameter slicer)`,
      });
      continue;
    }

    const col = resolveColumnProj(proj);
    if (!col) continue;
    if (usedFilterFields.has(col.field)) {
      report.skipped.push({
        category: 'slicer',
        source: srcLabel,
        detail: `duplicate slicer on field "${col.field}"`,
      });
      continue;
    }
    usedFilterFields.add(col.field);

    const filterLabel = visual.title ? visual.title.replace(/\s*\|.*$/, '').trim() : col.label;
    const filterId = makeUniqueId(filterLabel, usedFilterIds, 'filter');
    const filterType: FilterSpec['type'] =
      visual.singleSelect === true || /\bsingle\b/i.test(visual.title ?? '')
        ? 'select'
        : 'multiselect';

    filters.push({
      id: filterId,
      label: filterLabel,
      type: filterType,
      dataset: datasetId,
      field: col.field,
      appliesTo: [...allPanelIds],
    });
    report.mapped.push({
      category: 'slicer',
      source: srcLabel,
      target: `filter.${filterId} (${filterType} on ${col.field})`,
      detail: `applies to ${allPanelIds.length} panel(s)`,
    });
  }

  // ---- Build dataset fields + Flint semantics ----
  const fields: Record<string, FieldType> = {};
  const semantics: Record<string, string | { semanticType: string; unit?: string }> = {};
  for (const [fname, colSpec] of registry.columns.entries()) {
    fields[fname] = colSpec.type;
    semantics[fname] = inferFlintSemantic(fname, colSpec.type, fieldFormats.get(fname));
  }

  // ---- Layout ----
  const layoutRows = mapPixelsToGrid(placed, page.height, report.approximated);

  return {
    datasetId,
    primaryFactTable,
    columns: registry.columns,
    fields,
    semantics,
    filters,
    panels,
    layout: { rows: layoutRows },
    report,
  };
}
