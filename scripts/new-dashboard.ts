/**
 * Deterministic scaffold for a new dashboard spec. Claude fills it in; it never invents the shape.
 * Usage: npm run new:dashboard -- <id> "<Title>" [dataset-fixture.json]
 */
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ID_PATTERN } from '../src/spec/schema';
import { DASHBOARD_DIR } from './lib/specs';

const [id, title = id, fixture = 'sales_daily.json'] = process.argv.slice(2);
if (!id || !ID_PATTERN.test(id)) {
  console.error('usage: npm run new:dashboard -- <id> "<Title>" [fixture.json]   (id: a-z0-9_-)');
  process.exit(1);
}
const file = join(DASHBOARD_DIR, `${id}.dashboard.yaml`);
if (existsSync(file)) {
  console.error(`${file} already exists`);
  process.exit(1);
}

const template = `# yaml-language-server: $schema=./dashboard.schema.json
version: 1
id: ${id}
title: ${JSON.stringify(title)}
description: TODO one sentence on who this is for and what decision it supports.

datasets:
  main:
    source: fixture
    path: ${fixture}
    fields:
      # TODO declare every field panels use: quantitative | temporal | nominal | ordinal
      date: temporal

filters: []

layout:
  rows:
    - height: 140
      cells:
        - { panel: placeholder, span: 12 }

panels:
  placeholder:
    title: TODO
    dataset: main
    renderer: kpi
    field: date
    aggregate: count
`;
writeFileSync(file, template);
console.log(`created dashboards/${id}.dashboard.yaml`);
