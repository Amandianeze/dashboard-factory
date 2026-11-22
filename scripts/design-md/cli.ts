/**
 * DESIGN.md tooling. DESIGN.md = generated YAML front matter (from tokens/) + curated prose.
 *
 *   npm run design:build              rewrite the front matter from tokens; the prose is kept
 *   npm run design:check              front matter is current, and `export --format dtcg`
 *                                     round-trips to the semantic tier
 *   npm run design:lint               @google/design.md lint, plus section order and the custom
 *                                     sections; fails on any error or warning
 *   npm run design:diff [-- <ref>]    compare with DESIGN.md at <ref> (default: master); fails on
 *                                     a regression (more errors or warnings than before)
 *   npm run design:taste -- "Do …"    learn-taste: add an accepted review rule to Do's and Don'ts
 *                                     on a new taste/<slug> branch and commit it, for a PR
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { format, resolveConfig } from 'prettier';
import { stringify } from 'yaml';
import { resolveSet, type Typography } from '../tokens/lib';
import { diff, exportDtcg, lint, DESIGN_MD_VERSION } from './adapter';
import { COLORS, ROUNDED, SPACING, TYPOGRAPHY, buildFrontMatter } from './frontmatter';

const FILE = 'DESIGN.md';
const HEADER =
  '# Generated from tokens/ by `npm run design:build`. Edit tokens/, not this block; the prose below is hand-written.';

/** Standard sections in the order the spec requires, then our custom sections. */
export const SECTIONS = [
  'Overview',
  'Colors',
  'Typography',
  'Layout',
  'Elevation & Depth',
  'Shapes',
  'Components',
  "Do's and Don'ts",
  'Data Visualization',
  'Motion',
  'Content & Formatting',
  'Host Theming',
];

export function splitDesignMd(text: string): { front: string; body: string } {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!m) throw new Error(`${FILE}: no YAML front matter (--- … ---) at the top`);
  return { front: m[1]!, body: text.slice(m[0].length) };
}

function rawFrontMatter(): string {
  return `${HEADER}\n${stringify(buildFrontMatter(), { lineWidth: 0 })}`.trimEnd();
}

/**
 * The file exactly as it should be on disk: generated front matter + the given prose, formatted
 * with the repo's Prettier config (the format-on-edit hook would reformat it anyway, so the
 * generated output has to be Prettier-stable).
 */
export async function renderFile(body: string): Promise<string> {
  const options = (await resolveConfig(FILE)) ?? {};
  return format(`---\n${rawFrontMatter()}\n---\n${body}`, { ...options, filepath: FILE });
}

const read = () => {
  if (!existsSync(FILE)) throw new Error(`${FILE} does not exist`);
  return readFileSync(FILE, 'utf8');
};

async function build() {
  const body = existsSync(FILE) ? splitDesignMd(read()).body : '\n# Factory DS\n';
  writeFileSync(FILE, await renderFile(body));
  console.log(`✓ ${FILE}: front matter written from tokens/`);
}

/** Front matter fresh + DTCG export matches the semantic tokens it came from. */
export async function check(text = read()): Promise<string[]> {
  const problems: string[] = [];
  const expected = splitDesignMd(await renderFile(splitDesignMd(text).body)).front;
  if (splitDesignMd(text).front !== expected)
    problems.push(`${FILE} front matter is stale: run \`npm run design:build\``);

  const set = resolveSet('light', 'comfortable');
  const want = (p: string) => set.tokens.get(p)!.resolved;
  const out = exportDtcg(text) as Record<string, Record<string, { $value: unknown }>>;
  const got = (group: string, name: string) => out[group]?.[name]?.$value;
  const dim = (v: unknown) => {
    const d = v as { value: number; unit: string } | undefined;
    return d ? `${d.value}${d.unit}` : undefined;
  };

  for (const [name, path] of COLORS) {
    const v = (got('color', name) as { hex?: string } | undefined)?.hex?.toLowerCase();
    if (v !== want(path))
      problems.push(
        `round-trip: colors.${name} exports ${v}, token ${path} is ${String(want(path))}`,
      );
  }
  for (const [name, path] of ROUNDED)
    if (dim(got('rounded', name)) !== `${String(want(path))}px`)
      problems.push(
        `round-trip: rounded.${name} exports ${dim(got('rounded', name))}, token ${path} is ${String(want(path))}px`,
      );
  for (const [name, path] of SPACING) {
    const t = set.tokens.get(path)!;
    if (t.type !== 'dimension') continue; // unitless numbers (column count) aren't DTCG dimensions
    if (dim(got('spacing', name)) !== `${String(t.resolved)}px`)
      problems.push(
        `round-trip: spacing.${name} exports ${dim(got('spacing', name))}, token ${path} is ${String(t.resolved)}px`,
      );
  }
  for (const k of TYPOGRAPHY) {
    const t = want(`typography.${k}`) as Typography;
    const v = got('typography', k) as Record<string, unknown> | undefined;
    // 0.4.0's DTCG export drops lineHeight, so it is compared in the front matter check only.
    const expected = {
      fontFamily: t.fontFamily.split(',')[0]!.replace(/"/g, '').trim(),
      fontSize: `${t.fontSize}px`,
      fontWeight: t.fontWeight,
      letterSpacing: `${t.letterSpacing}px`,
    };
    const actual = v && {
      fontFamily: v.fontFamily,
      fontSize: dim(v.fontSize),
      fontWeight: v.fontWeight,
      letterSpacing: dim(v.letterSpacing),
    };
    if (JSON.stringify(actual) !== JSON.stringify(expected))
      problems.push(
        `round-trip: typography.${k} exports ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`,
      );
  }
  return problems;
}

/** The linter's findings plus our structural rules. */
export function lintAll(text = read()): { errors: string[]; warnings: string[] } {
  const report = lint(text);
  const errors = report.findings
    .filter((f) => f.severity === 'error')
    .map((f) => `${f.path ?? ''} ${f.message}`);
  const warnings = report.findings
    .filter((f) => f.severity === 'warning')
    .map((f) => `${f.path ?? ''} ${f.message}`);
  const headings = [...splitDesignMd(text).body.matchAll(/^## (.+)$/gm)].map((m) => m[1]!.trim());
  const missing = SECTIONS.filter((s) => !headings.includes(s));
  if (missing.length) errors.push(`missing sections: ${missing.join(', ')}`);
  const order = headings.filter((h) => SECTIONS.includes(h));
  if (order.join('|') !== SECTIONS.filter((s) => order.includes(s)).join('|'))
    errors.push(`sections out of order: ${order.join(' → ')}`);
  const extra = headings.filter((h) => !SECTIONS.includes(h));
  if (extra.length)
    warnings.push(`unexpected sections (add them to SECTIONS or remove): ${extra.join(', ')}`);
  return { errors, warnings };
}

function baseText(ref: string): string | undefined {
  const r = spawnSync('git', ['show', `${ref}:${FILE}`], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout : undefined;
}

function taste(rule: string) {
  if (!/^(Do|Don't) /.test(rule)) throw new Error('A taste rule starts with "Do " or "Don\'t ".');
  const git = (...a: string[]) => execFileSync('git', a, { encoding: 'utf8' }).trim();
  if (git('status', '--porcelain', FILE))
    throw new Error(`${FILE} has uncommitted changes; commit them first`);
  const slug = rule
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  const branch = `taste/${slug}`;
  git('switch', '-c', branch);
  const text = read();
  const next = text.replace(
    /(## Do's and Don'ts\n[\s\S]*?)(\n## |\s*$)/,
    (_m, section: string, after: string) => {
      return `${section.trimEnd()}\n- ${rule} _(learned from review, ${new Date().toISOString().slice(0, 10)})_\n${after.startsWith('\n## ') ? '\n' + after.trimStart() : after}`;
    },
  );
  if (next === text) throw new Error("couldn't find the Do's and Don'ts section");
  writeFileSync(FILE, next);
  const { errors } = lintAll(next);
  if (errors.length) throw new Error(`the rule breaks DESIGN.md lint:\n${errors.join('\n')}`);
  git('add', FILE);
  git('commit', '-m', `DESIGN.md: learn-taste rule\n\n${rule}`);
  console.log(
    `✓ committed on ${branch}. Open a PR for design review; never merge taste rules silently.`,
  );
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  const fail = (lines: string[], label: string) => {
    for (const l of lines) console.error(`✗ ${l}`);
    console.error(`✗ ${label}`);
    process.exit(1);
  };
  switch (cmd) {
    case 'build':
      return build();
    case 'check': {
      const problems = await check();
      if (problems.length) fail(problems, `${FILE}: ${problems.length} problem(s)`);
      return console.log(`✓ ${FILE}: front matter current; DTCG export round-trips to tokens/`);
    }
    case 'lint': {
      const { errors, warnings } = lintAll();
      if (errors.length || warnings.length)
        fail(
          [...errors, ...warnings],
          `${FILE} lint (@google/design.md ${DESIGN_MD_VERSION}): ${errors.length} error(s), ${warnings.length} warning(s)`,
        );
      return console.log(
        `✓ ${FILE} lint clean (@google/design.md ${DESIGN_MD_VERSION}, ${SECTIONS.length} sections in order)`,
      );
    }
    case 'diff': {
      const ref = args[0] ?? process.env.DESIGN_DIFF_BASE ?? 'master';
      const before = baseText(ref);
      if (!before)
        return console.log(`✓ ${FILE} diff: no ${FILE} at ${ref} yet; nothing to compare`);
      const report = diff(before, read());
      const changed = Object.entries(report.tokens)
        .map(([g, d]) => `${g}: +${d.added.length} −${d.removed.length} ~${d.modified.length}`)
        .join(', ');
      if (report.regression)
        fail([changed], `${FILE} diff vs ${ref}: regression (more lint findings than before)`);
      return console.log(`✓ ${FILE} diff vs ${ref}: no regression (${changed})`);
    }
    case 'taste':
      return taste(args.join(' ').trim());
    default:
      console.error(
        'usage: tsx scripts/design-md/cli.ts build|check|lint|diff [ref]|taste "<rule>"',
      );
      process.exit(2);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e: unknown) => {
    console.error(`✗ ${(e as Error).message}`);
    process.exit(1);
  });
}
