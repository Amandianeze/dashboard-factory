import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkSpecFile, ROOT } from '../../scripts/lib/specs';
import { importPowerBiPage } from '../../scripts/powerbi/emit';

const FIXTURES_ROOT = join(ROOT, 'tests', 'fixtures', 'powerbi');
const GOLDEN_ROOT = join(FIXTURES_ROOT, 'golden');

const CASES: Array<{ id: string; csvDir?: string }> = [
  { id: 'minimal-sales' },
  { id: 'fp-scenario-v2', csvDir: join(FIXTURES_ROOT, 'fp-scenario-v2', 'csv') },
  { id: 'variance-waterfall-extended' },
  { id: 'item-highlighting-2' },
];

describe('Power BI importer — golden PBIP fixtures', () => {
  for (const c of CASES) {
    it(`imports "${c.id}" matching committed golden spec/report and passes checkSpecFile`, async () => {
      const tmpOut = mkdtempSync(join(tmpdir(), `pbi-golden-${c.id}-`));
      try {
        const res = await importPowerBiPage({
          pbipPath: join(FIXTURES_ROOT, c.id),
          id: c.id,
          csvDir: c.csvDir,
          outDir: tmpOut,
        });

        expect(res.report.validationErrors).toEqual([]);
        expect(res.writtenFiles.specPath).toBeDefined();

        // Independently verify with the repo spec validator against the temp fixture dir
        const checked = checkSpecFile(res.writtenFiles.specPath!, join(tmpOut, 'public', 'data'));
        expect(checked.errors).toEqual([]);

        const expectedYaml = readFileSync(join(GOLDEN_ROOT, `${c.id}.dashboard.yaml`), 'utf8');
        const expectedReport = readFileSync(join(GOLDEN_ROOT, `${c.id}.import-report.md`), 'utf8');

        expect(res.yamlText).toBe(expectedYaml);
        expect(res.reportMarkdown).toBe(expectedReport);
      } finally {
        rmSync(tmpOut, { recursive: true, force: true });
      }
    });
  }
});
