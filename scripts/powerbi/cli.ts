/**
 * CLI entrypoint for the Power BI (.pbip) importer.
 *
 * Usage:
 *   npm run import:powerbi -- <path-to-.pbip> [options]
 *
 * Options:
 *   --page <name-or-id>   Import a specific page (default: first visible non-tooltip page)
 *   --id <dashboard-id>   Override generated dashboard id
 *   --csv-dir <dir>       Hydrate fixture rows from exported table CSVs
 *   --out-dir <dir>       Output root directory (default: repo root)
 *   --list-pages          List visible pages and visual counts without writing
 *   --dry-run             Parse, map, and validate in memory without writing
 */
import { relative } from 'node:path';
import { ROOT } from '../lib/specs';
import { importPowerBiPage } from './emit';
import { readPbirPages, resolvePbipPaths } from './read-pbip';

function parseArgs(argv: string[]) {
  let pbipPath: string | undefined;
  let page: string | undefined;
  let id: string | undefined;
  let csvDir: string | undefined;
  let outDir: string | undefined;
  let listPages = false;
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--page') page = argv[++i];
    else if (arg === '--id') id = argv[++i];
    else if (arg === '--csv-dir') csvDir = argv[++i];
    else if (arg === '--out-dir') outDir = argv[++i];
    else if (arg === '--list-pages') listPages = true;
    else if (arg === '--dry-run') dryRun = true;
    else if (arg === '--help' || arg === '-h') {
      console.log(
        [
          'Usage: npm run import:powerbi -- <path-to-.pbip> [options]',
          '',
          'Options:',
          '  --page <name-or-id>   Select a specific report page',
          '  --id <dashboard-id>   Override output dashboard id',
          '  --csv-dir <dir>       Hydrate fixture from exported table CSVs',
          '  --out-dir <dir>       Override output root directory',
          '  --list-pages          List available pages and exit',
          '  --dry-run             Validate without writing files',
        ].join('\n'),
      );
      process.exit(0);
    } else if (!arg.startsWith('-') && !pbipPath) {
      pbipPath = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!pbipPath) {
    throw new Error('Missing <path-to-.pbip>. Run with --help for usage.');
  }
  return { pbipPath, page, id, csvDir, outDir, listPages, dryRun };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.listPages) {
    const paths = resolvePbipPaths(args.pbipPath);
    const pages = readPbirPages(paths.reportDir);
    for (const p of pages) {
      if (p.isTooltip || p.isHidden) continue;
      console.log(
        `${p.id}\t${p.displayName}\t(${p.width}x${p.height}, ${p.visuals.length} visuals)`,
      );
    }
    return;
  }

  const res = await importPowerBiPage({
    pbipPath: args.pbipPath,
    page: args.page,
    id: args.id,
    csvDir: args.csvDir,
    outDir: args.outDir,
    dryRun: args.dryRun,
  });

  const rel = (p?: string) => (p ? relative(ROOT, p) || p : '(dry-run)');
  console.log(`Imported "${res.report.pageName}" -> dashboard "${res.dashboardId}"`);
  console.log(
    `  mapped: ${res.report.mapped.length}, approximated: ${res.report.approximated.length}, skipped: ${res.report.skipped.length}`,
  );
  if (!args.dryRun) {
    console.log(`  spec:    ${rel(res.writtenFiles.specPath)}`);
    console.log(`  fixture: ${rel(res.writtenFiles.fixturePath)} (${res.rowsCount} rows)`);
    console.log(`  report:  ${rel(res.writtenFiles.reportPath)}`);
  }

  if (res.report.validationErrors.length > 0) {
    console.error(`✗ validation failed (${res.report.validationErrors.length} error(s)):`);
    for (const err of res.report.validationErrors) console.error(`  - ${err}`);
    process.exit(1);
  }
  console.log('✓ spec validation passed');
}

main().catch((err: unknown) => {
  console.error(`✗ import:powerbi: ${(err as Error).message}`);
  process.exit(1);
});
