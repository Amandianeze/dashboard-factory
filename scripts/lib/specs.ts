/** Node-side helpers shared by scripts and tests: find specs, load fixtures, deep-check panels. */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { compile } from 'vega-lite';
import type { Row } from '../../src/data/transforms';
import { buildVegaLiteSpec } from '../../src/renderers/vegaLiteSpec';
import type { DashboardSpec } from '../../src/spec/types';
import { parseDashboardYaml } from '../../src/spec/validate';

export const ROOT = resolve(import.meta.dirname, '..', '..');
export const DASHBOARD_DIR = join(ROOT, 'dashboards');
export const FIXTURE_DIR = join(ROOT, 'public', 'data');

export const listSpecFiles = () =>
  readdirSync(DASHBOARD_DIR)
    .filter((f) => f.endsWith('.dashboard.yaml'))
    .map((f) => join(DASHBOARD_DIR, f));

export function loadFixture(path: string): Row[] | string {
  const file = join(FIXTURE_DIR, path);
  if (!existsSync(file))
    return `fixture public/data/${path} not found (run npm run data:fixtures?)`;
  const rows: unknown = JSON.parse(readFileSync(file, 'utf8'));
  return Array.isArray(rows) ? (rows as Row[]) : `fixture ${path} is not an array`;
}

/**
 * Full check of one spec file: schema + cross-refs + catalog props (validateDashboard), then
 * fixture rows contain every declared field, then every Vega-Lite panel compiles.
 */
export function checkSpecFile(file: string): { spec?: DashboardSpec; errors: string[] } {
  const name = basename(file);
  const result = parseDashboardYaml(readFileSync(file, 'utf8'));
  if (!result.ok) return { errors: result.errors };
  const spec = result.spec;
  const errors: string[] = [];

  if (`${spec.id}.dashboard.yaml` !== name)
    errors.push(`id: "${spec.id}" must match the file name (${name})`);

  const data: Record<string, Row[]> = {};
  for (const [id, ds] of Object.entries(spec.datasets)) {
    if (ds.source !== 'fixture') continue; // api datasets are checked by contract tests (phase 3)
    const rows = loadFixture(ds.path);
    if (typeof rows === 'string') {
      errors.push(`datasets.${id}: ${rows}`);
      continue;
    }
    data[id] = rows;
    const sample = rows[0] ?? {};
    for (const field of Object.keys(ds.fields))
      if (!(field in sample))
        errors.push(`datasets.${id}.fields.${field}: missing from fixture rows`);
  }

  for (const [id, panel] of Object.entries(spec.panels)) {
    if (panel.renderer !== 'vega-lite') continue;
    try {
      compile(buildVegaLiteSpec(panel, (data[panel.dataset] ?? []).slice(0, 50)));
    } catch (e) {
      errors.push(`panels.${id}.spec: Vega-Lite compile failed: ${(e as Error).message}`);
    }
  }
  return { spec, errors };
}
