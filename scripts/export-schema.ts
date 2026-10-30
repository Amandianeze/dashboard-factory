/**
 * Export the Zod spec schema as JSON Schema for editor autocomplete in YAML files
 * (yaml-language-server) and for any non-TS tooling. Usage: npm run spec:schema
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { DashboardSpec } from '../src/spec/schema';
import { DASHBOARD_DIR } from './lib/specs';

const schema = zodToJsonSchema(DashboardSpec, { name: 'DashboardSpec', $refStrategy: 'none' });
const out = join(DASHBOARD_DIR, 'dashboard.schema.json');
writeFileSync(out, JSON.stringify(schema, null, 2) + '\n');
console.log('wrote dashboards/dashboard.schema.json (generated — do not edit)');
