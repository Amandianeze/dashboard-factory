/** Resolve a .pbip file and read its PBIR v2.0.0 pages and visuals. */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import type { PbirPage, PbirProjection, PbirProjectionKind, PbirVisual, PbipPaths } from './types';

interface PbipManifest {
  artifacts?: Array<{ report?: { path?: string } }>;
}

interface DefinitionPbir {
  version?: string;
  datasetReference?: { byPath?: { path?: string } };
}

interface PagesManifest {
  pageOrder?: string[];
  activePageName?: string;
}

/** Strip invisible directional/BOM characters (e.g. \u200e padding used in Power BI titles). */
export function sanitizePowerBiText(raw: string): string {
  return raw
    .replace(/[\u200b-\u200f\u202a-\u202e\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function unquotePowerBiLiteral(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
}

/** Locate the .pbip file, .Report directory, and .SemanticModel directory. */
export function resolvePbipPaths(inputPath: string): PbipPaths {
  const abs = resolve(inputPath);
  if (!existsSync(abs)) throw new Error(`PBIP path does not exist: ${abs}`);

  let pbipFile = abs;
  if (statSync(abs).isDirectory()) {
    const candidates = readdirSync(abs)
      .filter((f) => f.endsWith('.pbip'))
      .sort();
    if (candidates.length !== 1) {
      throw new Error(
        `Expected exactly 1 .pbip file in ${abs}, found ${candidates.length}${candidates.length ? ` (${candidates.join(', ')})` : ''}`,
      );
    }
    pbipFile = join(abs, candidates[0]!);
  } else if (!abs.endsWith('.pbip')) {
    throw new Error(`Expected a .pbip file or directory containing one, got: ${abs}`);
  }

  const rootDir = dirname(pbipFile);
  const projectName = basename(pbipFile, '.pbip');
  const manifest = JSON.parse(readFileSync(pbipFile, 'utf8')) as PbipManifest;
  const relReport = manifest.artifacts?.find((a) => a.report?.path)?.report?.path;
  if (!relReport) throw new Error(`${pbipFile}: missing artifacts[0].report.path`);

  const reportDir = resolve(rootDir, relReport);
  const pbirFile = join(reportDir, 'definition.pbir');
  if (!existsSync(pbirFile)) throw new Error(`Missing definition.pbir at ${pbirFile}`);

  const pbir = JSON.parse(readFileSync(pbirFile, 'utf8')) as DefinitionPbir;
  const version = pbir.version ?? '';
  if (!version.startsWith('4.')) {
    throw new Error(
      `Unsupported PBIR version "${version || 'unknown'}" in ${pbirFile}. v1 requires PBIR v2.0.0 (definition.pbir version 4.x); PBIR-Legacy (1.0) is not supported.`,
    );
  }

  const relModel = pbir.datasetReference?.byPath?.path;
  if (!relModel) {
    throw new Error(
      `${pbirFile}: missing datasetReference.byPath.path (live/remote datasets are unsupported)`,
    );
  }
  const semanticModelDir = resolve(reportDir, relModel);
  if (!existsSync(semanticModelDir)) {
    throw new Error(`Semantic model directory not found: ${semanticModelDir}`);
  }

  return { pbipFile, projectName, reportDir, semanticModelDir };
}

function extractTitle(visualObj: Record<string, unknown>): string | undefined {
  const vco = visualObj.visualContainerObjects as Record<string, unknown> | undefined;
  const titles = Array.isArray(vco?.title) ? (vco.title as Array<Record<string, unknown>>) : [];
  for (const item of titles) {
    const props = item.properties as Record<string, unknown> | undefined;
    const show = (props?.show as Record<string, unknown> | undefined)?.expr as
      { Literal?: { Value?: string } } | undefined;
    if (show?.Literal?.Value === 'false') continue;
    const text = (props?.text as Record<string, unknown> | undefined)?.expr as
      { Literal?: { Value?: string } } | undefined;
    if (typeof text?.Literal?.Value === 'string') {
      const cleaned = sanitizePowerBiText(unquotePowerBiLiteral(text.Literal.Value));
      if (cleaned) return cleaned;
    }
  }
  return undefined;
}

function extractSingleSelect(visualObj: Record<string, unknown>): boolean | undefined {
  const objects = visualObj.objects as Record<string, unknown> | undefined;
  const selection = Array.isArray(objects?.selection)
    ? (objects.selection as Array<Record<string, unknown>>)
    : [];
  for (const item of selection) {
    const props = item.properties as Record<string, unknown> | undefined;
    const val = (props?.singleSelect as Record<string, unknown> | undefined)?.expr as
      { Literal?: { Value?: string } } | undefined;
    if (val?.Literal?.Value === 'true') return true;
    if (val?.Literal?.Value === 'false') return false;
  }
  return undefined;
}

function parseProjection(bucket: string, raw: Record<string, unknown>): PbirProjection {
  const field = (raw.field ?? {}) as Record<string, unknown>;
  const queryRef = typeof raw.queryRef === 'string' ? raw.queryRef : '';
  const nativeQueryRef = typeof raw.nativeQueryRef === 'string' ? raw.nativeQueryRef : undefined;
  const displayName =
    typeof raw.displayName === 'string' ? sanitizePowerBiText(raw.displayName) : undefined;

  if (field.Column && typeof field.Column === 'object') {
    const c = field.Column as {
      Expression?: { SourceRef?: { Entity?: string } };
      Property?: string;
    };
    return {
      bucket,
      kind: 'Column',
      entity: c.Expression?.SourceRef?.Entity,
      property: c.Property,
      queryRef,
      nativeQueryRef,
      displayName,
    };
  }
  if (field.Measure && typeof field.Measure === 'object') {
    const m = field.Measure as {
      Expression?: { SourceRef?: { Entity?: string } };
      Property?: string;
    };
    return {
      bucket,
      kind: 'Measure',
      entity: m.Expression?.SourceRef?.Entity,
      property: m.Property,
      queryRef,
      nativeQueryRef,
      displayName,
    };
  }
  if (field.Aggregation && typeof field.Aggregation === 'object') {
    const a = field.Aggregation as {
      Expression?: {
        Column?: { Expression?: { SourceRef?: { Entity?: string } }; Property?: string };
      };
      Function?: number;
    };
    return {
      bucket,
      kind: 'Aggregation',
      entity: a.Expression?.Column?.Expression?.SourceRef?.Entity,
      property: a.Expression?.Column?.Property,
      aggregationFn: a.Function,
      queryRef,
      nativeQueryRef,
      displayName,
    };
  }
  const firstKey = Object.keys(field)[0] ?? 'Other';
  const kind: PbirProjectionKind =
    firstKey === 'Arithmetic' || firstKey === 'NativeVisualCalculation' ? firstKey : 'Other';
  return { bucket, kind, queryRef, nativeQueryRef, displayName };
}

function readVisual(filePath: string): PbirVisual {
  const raw = JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, unknown>;
  const id = typeof raw.name === 'string' ? raw.name : basename(dirname(filePath));
  const posRaw = (raw.position ?? {}) as Record<string, unknown>;
  const position = {
    x: Number(posRaw.x ?? 0),
    y: Number(posRaw.y ?? 0),
    width: Number(posRaw.width ?? 0),
    height: Number(posRaw.height ?? 0),
    z: Number(posRaw.z ?? 0),
  };
  const isHidden = raw.isHidden === true;
  if ('visualGroup' in raw && !('visual' in raw)) {
    return { id, visualType: 'visualGroup', isHidden, isGroup: true, position, projections: [] };
  }

  const vis = (raw.visual ?? {}) as Record<string, unknown>;
  const visualType = typeof vis.visualType === 'string' ? vis.visualType : 'unknown';
  const query = (vis.query ?? {}) as {
    queryState?: Record<string, { projections?: Array<Record<string, unknown>> }>;
  };
  const projections: PbirProjection[] = [];
  for (const [bucket, state] of Object.entries(query.queryState ?? {})) {
    for (const p of state?.projections ?? []) {
      projections.push(parseProjection(bucket, p));
    }
  }

  return {
    id,
    visualType,
    title: extractTitle(vis),
    isHidden,
    isGroup: false,
    position,
    projections,
    singleSelect: extractSingleSelect(vis),
  };
}

/** Read all pages (in pages.json order) from a PBIR v2.0.0 .Report directory. */
export function readPbirPages(reportDir: string): PbirPage[] {
  const pagesRoot = join(reportDir, 'definition', 'pages');
  const pagesJsonPath = join(pagesRoot, 'pages.json');
  if (!existsSync(pagesJsonPath)) throw new Error(`Missing PBIR pages manifest: ${pagesJsonPath}`);

  const manifest = JSON.parse(readFileSync(pagesJsonPath, 'utf8')) as PagesManifest;
  const pageIds = manifest.pageOrder ?? [];
  const pages: PbirPage[] = [];

  for (const pid of pageIds) {
    const pageDir = join(pagesRoot, pid);
    const pageMetaPath = join(pageDir, 'page.json');
    if (!existsSync(pageMetaPath)) continue;
    const meta = JSON.parse(readFileSync(pageMetaPath, 'utf8')) as Record<string, unknown>;
    const visualsDir = join(pageDir, 'visuals');
    const visuals: PbirVisual[] = [];
    if (existsSync(visualsDir)) {
      for (const entry of readdirSync(visualsDir).sort()) {
        const vf = join(visualsDir, entry, 'visual.json');
        if (existsSync(vf)) visuals.push(readVisual(vf));
      }
    }
    pages.push({
      id: typeof meta.name === 'string' ? meta.name : pid,
      displayName: sanitizePowerBiText(
        typeof meta.displayName === 'string' ? meta.displayName : pid,
      ),
      width: Number(meta.width ?? 1280),
      height: Number(meta.height ?? 720),
      isTooltip: meta.type === 'Tooltip',
      isHidden: meta.visibility === 'HiddenInViewMode',
      visuals,
    });
  }

  return pages;
}

/** Pick one page by displayName/id or default to the first visible non-tooltip page. */
export function selectPbirPage(pages: PbirPage[], selector?: string): PbirPage {
  if (selector) {
    const needle = sanitizePowerBiText(selector).toLowerCase();
    const byId = pages.find((p) => p.id.toLowerCase() === needle);
    if (byId) return byId;
    const byName = pages.find((p) => p.displayName.toLowerCase() === needle);
    if (byName) return byName;
    const available = pages
      .filter((p) => !p.isTooltip && !p.isHidden)
      .slice(0, 10)
      .map((p) => `"${p.displayName}" (${p.id})`)
      .join(', ');
    throw new Error(`Page "${selector}" not found. Examples: ${available}`);
  }
  const firstVisible = pages.find((p) => !p.isTooltip && !p.isHidden);
  if (firstVisible) return firstVisible;
  if (pages[0]) return pages[0];
  throw new Error('PBIP report contains no pages');
}
