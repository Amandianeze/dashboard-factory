/**
 * Render ONE panel in a real browser and print what an agent needs to debug it: screenshot path,
 * console errors, panel size, alerts, and (for Vega-Lite) the compiled Vega spec.
 * Usage: npm run panel:render -- <dashboard-id> <panel-id> [--filter id=value,value]
 * Output: test-results/render-panel/<dashboard>--<panel>.{png,vega.json}
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { compile } from 'vega-lite';
import { createServer } from 'vite';
import { buildVegaLiteSpec } from '../src/renderers/vegaLiteSpec';
import { checkSpecFile, listSpecFiles, loadFixture, ROOT } from './lib/specs';
import type { Row } from '../src/data/transforms';

const [dashboardId, panelId, ...rest] = process.argv.slice(2);
if (!dashboardId || !panelId) {
  console.error('usage: npm run panel:render -- <dashboard-id> <panel-id> [--filter id=a,b]');
  process.exit(1);
}

const found = listSpecFiles()
  .map((f) => checkSpecFile(f))
  .find((r) => r.spec?.id === dashboardId);
const panel = found?.spec?.panels[panelId];
if (!found?.spec || !panel) {
  console.error(`no panel "${panelId}" in dashboard "${dashboardId}" (does the spec validate?)`);
  process.exit(1);
}
if (found.errors.length)
  console.warn(`spec has validation errors:\n  ${found.errors.join('\n  ')}`);

const outDir = join(ROOT, 'test-results', 'render-panel');
mkdirSync(outDir, { recursive: true });
const base = join(outDir, `${dashboardId}--${panelId}`);

if (panel.renderer === 'vega-lite') {
  const ds = found.spec.datasets[panel.dataset];
  const rows = ds?.source === 'fixture' ? loadFixture(ds.path) : [];
  const vl = buildVegaLiteSpec(panel, Array.isArray(rows) ? (rows as Row[]).slice(0, 5) : []);
  writeFileSync(`${base}.vega.json`, JSON.stringify(compile(vl).spec, null, 2));
}

const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 0 } });
await server.listen();
const url = server.resolvedUrls?.local[0];
const browser = await chromium.launch(
  process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
);
let code = 0;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const logs: string[] = [];
  page.on('console', (m) => m.type() === 'error' && logs.push(m.text()));
  page.on('pageerror', (e) => logs.push(e.message));
  await page.goto(`${url}#/d/${dashboardId}`);

  const filterArg = rest[rest.indexOf('--filter') + 1];
  if (rest.includes('--filter') && filterArg) {
    const [fid, values = ''] = filterArg.split('=');
    for (const v of values.split(',').filter(Boolean))
      await page
        .getByRole('group', { name: 'Filters' })
        .getByRole('button', { name: v, exact: true })
        .click()
        .catch(() => logs.push(`filter ${fid}: no control for "${v}"`));
  }

  const el = page.getByTestId(`panel-${panelId}`);
  await el.waitFor({ timeout: 10_000 });
  const drawn = panel.renderer === 'kpi' ? '.kpi-value' : 'svg, canvas';
  await el
    .locator(drawn)
    .first()
    .waitFor({ timeout: 15_000 })
    .catch(() => logs.push(`nothing matching "${drawn}" was drawn within 15s`));
  await page.waitForTimeout(300);

  const box = await el.boundingBox();
  const body = await el.locator('.panel-body').boundingBox();
  const alerts = await el.getByRole('alert').allTextContents();
  const svgEl = el.locator('svg').first();
  const svg = (await svgEl.count()) ? await svgEl.boundingBox() : null;
  await el.screenshot({ path: `${base}.png` });

  console.log(`panel      ${dashboardId}/${panelId} (${panel.renderer})`);
  console.log(`screenshot ${base}.png`);
  if (panel.renderer === 'vega-lite') console.log(`vega spec  ${base}.vega.json`);
  console.log(`panel box  ${JSON.stringify(box)}`);
  console.log(`body box   ${JSON.stringify(body)}`);
  console.log(`svg box    ${JSON.stringify(svg)}`);
  console.log(`alerts     ${alerts.length ? alerts.join(' | ') : 'none'}`);
  console.log(`console    ${logs.length ? '\n  ' + logs.join('\n  ') : 'no errors'}`);
  if (alerts.length || logs.length) code = 1;
} finally {
  await browser.close();
  await server.close();
}
process.exit(code);
