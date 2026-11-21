/**
 * LLD check: every docs/lld/<id>.md has valid front matter (schema + cross-file checks shared with
 * catalog:build), and every item that needs a full LLD has the body sections of _template.md in
 * order. Props files are type-checked by `npm run typecheck` (docs/lld is in tsconfig).
 *
 *   npm run lld:check
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LLD_DIR, loadItems } from '../catalog/build';
import { LLD_SECTIONS, needsFullLld, type CatalogItem } from '../catalog/schema';

/** `## ` headings of an LLD body, in order. */
export const headings = (text: string) =>
  [...text.replace(/^---\n[\s\S]*?\n---\n/, '').matchAll(/^## (.+)$/gm)].map((m) => m[1]!.trim());

/** Missing or out-of-order template sections; [] when the body is complete. */
export function sectionErrors(text: string): string[] {
  const found = headings(text);
  const errors: string[] = [];
  let last = -1;
  for (const s of LLD_SECTIONS) {
    const at = found.indexOf(s);
    if (at === -1) errors.push(`missing section "## ${s}"`);
    else if (at < last) errors.push(`section "## ${s}" is out of order`);
    else last = at;
  }
  return errors;
}

function main() {
  const { items, errors } = loadItems();
  const full: CatalogItem[] = items.filter(needsFullLld);
  for (const item of full) {
    const text = readFileSync(join(LLD_DIR, `${item.id}.md`), 'utf8');
    for (const e of sectionErrors(text)) errors.push(`docs/lld/${item.id}.md: ${e}`);
  }
  if (errors.length) {
    for (const e of errors) console.error(`✗ ${e}`);
    console.error(`✗ lld:check: ${errors.length} problem(s)`);
    process.exit(1);
  }
  console.log(
    `✓ lld:check: ${items.length} items; ${full.length} full LLDs valid, ${items.length - full.length} P3 stubs`,
  );
}

if (process.argv[1]?.endsWith('check.ts')) main();
