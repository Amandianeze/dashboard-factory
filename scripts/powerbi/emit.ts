/** Orchestrate PBIP -> DashboardSpec YAML, fixture JSON, Markdown import report, and validation. */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { format, resolveConfig } from 'prettier';
import { stringify } from 'yaml';
import type { DashboardSpec } from '../../src/spec/types';
import { checkSpecFile, ROOT } from '../lib/specs';
import { buildDatasetRows } from './build-dataset';
import { mapPageToDashboard, toDashboardId } from './map-visuals';
import { readTmdlModel } from './parse-tmdl';
import { readPbirPages, resolvePbipPaths, selectPbirPage } from './read-pbip';
import type { ImportReport, ReportEntry } from './types';

export interface ImportOptions {
  pbipPath: string;
  page?: string;
  id?: string;
  csvDir?: string;
  outDir?: string;
  dryRun?: boolean;
}

export interface ImportResult {
  dashboardId: string;
  spec: DashboardSpec;
  yamlText: string;
  reportMarkdown: string;
  report: ImportReport;
  rowsCount: number;
  writtenFiles: {
    specPath?: string;
    fixturePath?: string;
    reportPath?: string;
  };
}

function renderSection(title: string, entries: ReportEntry[]): string[] {
  const lines = [`## ${title} (${entries.length})`, ''];
  if (entries.length === 0) {
    lines.push('_None._', '');
    return lines;
  }
  lines.push('| Category | Source | Target | Detail |', '| --- | --- | --- | --- |');
  for (const e of entries) {
    const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
    lines.push(
      `| ${esc(e.category)} | ${esc(e.source)} | ${esc(e.target ?? '—')} | ${esc(e.detail)} |`,
    );
  }
  lines.push('');
  return lines;
}

/** Format an ImportReport as deterministic Markdown (omits wall-clock timestamps for golden tests). */
export function renderImportReport(report: ImportReport): string {
  const lines: string[] = [
    `# Power BI Import Report — \`${report.dashboardId}\``,
    '',
    `- **Source PBIP:** \`${report.sourcePbip}\``,
    `- **Page:** ${report.pageName} (\`${report.pageId}\`, ${report.canvas.width}×${report.canvas.height})`,
    `- **Validation:** ${report.validationErrors.length === 0 ? 'PASS (0 errors)' : `FAIL (${report.validationErrors.length} error(s))`}`,
    '',
    ...renderSection('Mapped', report.mapped),
    ...renderSection('Approximated', report.approximated),
    ...renderSection('Skipped', report.skipped),
  ];

  if (report.validationErrors.length > 0) {
    lines.push('## Validation errors', '');
    for (const err of report.validationErrors) lines.push(`- ${err}`);
    lines.push('');
  }
  return lines.join('\n');
}

async function formatYaml(raw: string, outPath: string): Promise<string> {
  const cfg = (await resolveConfig(outPath)) ?? {};
  return format(raw, { ...cfg, parser: 'yaml' });
}

async function formatMarkdown(raw: string, outPath: string): Promise<string> {
  const cfg = (await resolveConfig(outPath)) ?? {};
  return format(raw, { ...cfg, parser: 'markdown' });
}

/** Run the full PBIP import pipeline for one page. */
export async function importPowerBiPage(opts: ImportOptions): Promise<ImportResult> {
  const paths = resolvePbipPaths(opts.pbipPath);
  const pages = readPbirPages(paths.reportDir);
  const page = selectPbirPage(pages, opts.page);
  const model = readTmdlModel(paths.semanticModelDir);

  const dashboardId = opts.id ? toDashboardId(opts.id) : toDashboardId(page.displayName);
  const mapped = mapPageToDashboard(page, model, {
    sourcePbip: basename(paths.pbipFile),
    dashboardId,
  });

  if (Object.keys(mapped.panels).length === 0) {
    throw new Error(
      `Page "${page.displayName}" produced 0 mappable panels (skipped ${mapped.report.skipped.length} items).`,
    );
  }

  const fixtureName = `${dashboardId}.json`;
  const rows = buildDatasetRows({
    seedKey: dashboardId,
    model,
    primaryFactTable: mapped.primaryFactTable,
    columns: mapped.columns,
    csvDir: opts.csvDir,
    mapped: mapped.report.mapped,
    approximated: mapped.report.approximated,
  });

  const spec: DashboardSpec = {
    version: 1,
    id: dashboardId,
    title: page.displayName,
    description: `Imported from Power BI (${paths.projectName} · ${page.displayName}).`,
    datasets: {
      [mapped.datasetId]: {
        source: 'fixture',
        path: fixtureName,
        description: mapped.primaryFactTable
          ? `Denormalized from ${mapped.primaryFactTable} via TMDL relationships.`
          : 'Generated fixture dataset from TMDL schema.',
        fields: mapped.fields,
        semantics: mapped.semantics,
      },
    },
    filters: mapped.filters,
    layout: mapped.layout,
    panels: mapped.panels,
  };

  const outRoot = opts.outDir ?? ROOT;
  const specPath = join(outRoot, 'dashboards', `${dashboardId}.dashboard.yaml`);
  const fixturePath = join(outRoot, 'public', 'data', fixtureName);
  const reportPath = join(
    outRoot,
    'docs',
    'powerbi-importer',
    'reports',
    `${dashboardId}.import-report.md`,
  );

  const rawYaml = `# yaml-language-server: $schema=./dashboard.schema.json\n${stringify(spec, { lineWidth: 100 })}`;
  const yamlText = await formatYaml(rawYaml, specPath);

  // Validate using the exact repo validator (checkSpecFile)
  if (opts.dryRun) {
    const tmp = mkdtempSync(join(tmpdir(), 'pbi-import-'));
    try {
      const tmpSpec = join(tmp, `${dashboardId}.dashboard.yaml`);
      writeFileSync(tmpSpec, yamlText, 'utf8');
      writeFileSync(join(tmp, fixtureName), JSON.stringify(rows), 'utf8');
      const checked = checkSpecFile(tmpSpec, tmp);
      mapped.report.validationErrors = checked.errors;
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
    const reportMarkdown = await formatMarkdown(renderImportReport(mapped.report), reportPath);
    return {
      dashboardId,
      spec,
      yamlText,
      reportMarkdown,
      report: mapped.report,
      rowsCount: rows.length,
      writtenFiles: {},
    };
  }

  mkdirSync(join(outRoot, 'dashboards'), { recursive: true });
  mkdirSync(join(outRoot, 'public', 'data'), { recursive: true });
  mkdirSync(join(outRoot, 'docs', 'powerbi-importer', 'reports'), { recursive: true });

  writeFileSync(fixturePath, JSON.stringify(rows), 'utf8');
  writeFileSync(specPath, yamlText, 'utf8');

  const checked = checkSpecFile(specPath, join(outRoot, 'public', 'data'));
  mapped.report.validationErrors = checked.errors;

  const reportMarkdown = await formatMarkdown(renderImportReport(mapped.report), reportPath);
  writeFileSync(reportPath, reportMarkdown, 'utf8');

  return {
    dashboardId,
    spec,
    yamlText,
    reportMarkdown,
    report: mapped.report,
    rowsCount: rows.length,
    writtenFiles: { specPath, fixturePath, reportPath },
  };
}
