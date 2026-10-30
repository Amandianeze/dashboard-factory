/**
 * Profile the fixture data behind dashboard specs. Unlike spec:validate (which samples row 0), this
 * checks EVERY row against the declared field types and reports what a chart author needs:
 * cardinality, nulls, ranges, negatives, label lengths, date coverage and row counts.
 * Usage: npm run data:profile [-- dashboards/<id>.dashboard.yaml ...]
 * Exit code 1 when any declared field is missing or mistyped in any row.
 */
import { relative, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { parseDashboardYaml } from '../src/spec/validate';
import type { FieldType } from '../src/spec/schema';
import { listSpecFiles, loadFixture, ROOT } from './lib/specs';

const ROW_BUDGET = 5_000; // beyond this, pre-aggregate or reconsider the renderer
const args = process.argv.slice(2);
const files = args.length ? args.map((a) => resolve(a)) : listSpecFiles();
const ISO_DATE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}.*)?$/;

const conforms = (type: FieldType, v: unknown) =>
  type === 'quantitative'
    ? typeof v === 'number' && Number.isFinite(v)
    : type === 'temporal'
      ? typeof v === 'string' && ISO_DATE.test(v) && !Number.isNaN(Date.parse(v))
      : typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';

let failed = 0;
for (const file of files) {
  const parsed = parseDashboardYaml(readFileSync(file, 'utf8'));
  if (!parsed.ok) {
    console.error(`✗ ${relative(ROOT, file)}: spec invalid; run npm run spec:validate`);
    failed++;
    continue;
  }
  for (const [dsId, ds] of Object.entries(parsed.spec.datasets)) {
    if (ds.source !== 'fixture') continue;
    const rows = loadFixture(ds.path);
    console.log(`\n${parsed.spec.id} › dataset "${dsId}" (${ds.path})`);
    if (typeof rows === 'string') {
      console.error(`  ✗ ${rows}`);
      failed++;
      continue;
    }
    console.log(
      `  rows: ${rows.length}${rows.length > ROW_BUDGET ? `  ⚠ over budget (${ROW_BUDGET})` : ''}`,
    );
    if (rows.length === 1) console.log('  ⚠ single row: charts will look degenerate');

    for (const [field, type] of Object.entries(ds.fields)) {
      const values = rows.map((r) => r[field]);
      const missing = values.filter((v) => v === undefined).length;
      const nulls = values.filter((v) => v === null).length;
      const bad = values.filter((v) => v != null && !conforms(type, v));
      const present = values.filter((v) => v != null);
      const distinct = new Set(present).size;
      const notes: string[] = [];

      if (type === 'quantitative') {
        const nums = present.filter((v): v is number => typeof v === 'number');
        if (nums.length) {
          notes.push(`min ${Math.min(...nums)}, max ${Math.max(...nums)}`);
          if (nums.some((n) => n < 0)) notes.push('has negatives');
          if (nums.every((n) => n === 0)) notes.push('⚠ all zero');
        }
      } else if (type === 'temporal') {
        const sorted = present.map(String).sort();
        if (sorted.length) notes.push(`${sorted[0]} → ${sorted.at(-1)}`);
      } else {
        const longest = present.reduce<string>(
          (m, v) => (String(v).length > m.length ? String(v) : m),
          '',
        );
        notes.push(`longest label ${longest.length} chars`);
        if (distinct > 8) notes.push(`⚠ ${distinct} categories: >8 colored series is unreadable`);
      }

      const problems: string[] = [];
      if (missing) problems.push(`${missing} rows missing the key`);
      if (bad.length)
        problems.push(`${bad.length} values do not fit "${type}" (e.g. ${JSON.stringify(bad[0])})`);
      if (problems.length) failed++;
      console.log(
        `  ${problems.length ? '✗' : '✓'} ${field} [${type}] distinct ${distinct}` +
          (nulls ? `, nulls ${nulls}` : '') +
          (notes.length ? `, ${notes.join(', ')}` : '') +
          (problems.length ? `\n      ${problems.join('\n      ')}` : ''),
      );
    }
  }
}
process.exit(failed ? 1 : 0);
