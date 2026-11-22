/**
 * Export the Zod spec schema as JSON Schema for editor autocomplete in YAML files
 * (yaml-language-server) and for any non-TS tooling. Usage: npm run spec:schema [-- --check]   (--check fails if stale; part of verify)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { DashboardSpec } from '../src/spec/schema';
import { DASHBOARD_DIR } from './lib/specs';

const schema = zodToJsonSchema(DashboardSpec, { name: 'DashboardSpec', $refStrategy: 'none' });
const out = join(DASHBOARD_DIR, 'dashboard.schema.json');
const text = JSON.stringify(schema, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (readFileSync(out, 'utf8') !== text) {
    console.error('✗ dashboards/dashboard.schema.json is stale; run `npm run spec:schema`');
    process.exit(1);
  }
  console.log('✓ dashboards/dashboard.schema.json up to date');
} else {
  writeFileSync(out, text);
  console.log('wrote dashboards/dashboard.schema.json (generated — do not edit)');
}
