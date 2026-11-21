/**
 * Phase 0 code inventory: every design value (colour, size, radius, shadow, duration, font, …)
 * that appears in src/ or index/public assets, classified as a token *definition* (inside
 * src/theme/) or a raw *usage* elsewhere. Deterministic; re-run after any change.
 *
 *   npx tsx scripts/inventory/code-inventory.ts            # writes docs/inventory/code-inventory.csv
 *   npx tsx scripts/inventory/code-inventory.ts --summary  # also prints counts per category
 *
 * .ts/.tsx files are parsed with the TypeScript compiler API, so only real literals count
 * (comments and identifiers are ignored). CSS is scanned declaration by declaration.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative, extname, dirname } from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const OUT = 'docs/inventory/code-inventory.csv';
const SCAN = ['src', 'index.html', 'public/favicon.svg'];

type Category =
  | 'color'
  | 'font-family'
  | 'font-size'
  | 'font-weight'
  | 'letter-spacing'
  | 'spacing'
  | 'radius'
  | 'size'
  | 'line-width'
  | 'opacity'
  | 'shadow'
  | 'duration'
  | 'easing'
  | 'breakpoint'
  | 'layout';

interface Hit {
  file: string;
  line: number;
  category: Category;
  property: string;
  value: string;
  kind: 'token-definition' | 'raw-usage' | 'token-reference';
  context: string;
}

const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g;

/** Property name → category for numeric / length values. Order matters (first match wins). */
const PROP_RULES: [RegExp, Category][] = [
  [/shadow/i, 'shadow'],
  [/(duration|delay|transition|animation)/i, 'duration'],
  [/(easing|timing)/i, 'easing'],
  [/(radius|^rx$|^ry$|cornerRadius)/i, 'radius'],
  [/fontFamily|font-family|^font$|^family$/i, 'font-family'],
  [/fontSize|font-size|^size[A-Z]/, 'font-size'],
  [/fontWeight|font-weight|weight/i, 'font-weight'],
  [/letter-?spacing/i, 'letter-spacing'],
  [/opacity/i, 'opacity'],
  [/(strokeWidth|stroke-width|borderWidth|^border$|linewidth)/i, 'line-width'],
  [/(gap|padding|margin|^pad$|^[lrtb]$|inset|gradientLength)/i, 'spacing'],
  [/(max-width|min-width|width|height|_W$|_H$|^w$|^h$|^size$)/i, 'size'],
  [/(grid-template|grid-column|span|columns)/i, 'layout'],
];

const categorize = (prop: string): Category | undefined =>
  PROP_RULES.find(([re]) => re.test(prop))?.[1];

const hits: Hit[] = [];
const isThemeFile = (f: string) => f.startsWith('src/theme/');

function walk(p: string): string[] {
  const abs = join(ROOT, p);
  try {
    return readdirSync(abs, { withFileTypes: true }).flatMap((d) => walk(join(p, d.name)));
  } catch {
    return [p];
  }
}

/* ---------------------------------------------------------------- CSS / HTML / SVG */

function scanCss(file: string, text: string) {
  const lines = text.split('\n');
  let selector = '';
  let media = '';
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (line.startsWith('@media')) media = line.replace(/\s*\{$/, '');
    if (line.endsWith('{')) selector = line.replace(/\s*\{$/, '');
    if (line.startsWith('@media')) {
      const bp = /(\d+px)/.exec(line);
      if (bp)
        hits.push({
          file,
          line: i + 1,
          category: 'breakpoint',
          property: '@media',
          value: bp[1]!,
          kind: 'raw-usage',
          context: line,
        });
      return;
    }
    const decl = /^([a-z-]+)\s*:\s*(.+?);?$/.exec(line);
    if (!decl) return;
    const [, prop, value] = decl as unknown as [string, string, string];
    const ctx = `${media ? media + ' ' : ''}${selector} { ${prop}: ${value} }`;
    if (/var\(--/.test(value) && !/\d/.test(value.replace(/var\([^)]*\)/g, ''))) {
      hits.push({
        file,
        line: i + 1,
        category: categorize(prop) ?? (/color|background|border/.test(prop) ? 'color' : 'layout'),
        property: prop,
        value,
        kind: 'token-reference',
        context: ctx,
      });
      return;
    }
    for (const c of value.match(COLOR_RE) ?? [])
      hits.push({
        file,
        line: i + 1,
        category: 'color',
        property: prop,
        value: c,
        kind: 'raw-usage',
        context: ctx,
      });
    if (/^(#fff|#000)$/i.test(value)) return;
    const stripped = value.replace(COLOR_RE, '').replace(/var\([^)]*\)/g, '');
    const cat = categorize(prop);
    // Structural resets (0, 100%, auto) are layout mechanics, not design values.
    if (cat && /\d/.test(stripped) && !/^(0|0 auto|100%|auto)$/.test(stripped.trim()))
      hits.push({
        file,
        line: i + 1,
        category: cat,
        property: prop,
        value: stripped.trim(),
        kind: 'raw-usage',
        context: ctx,
      });
  });
}

function scanMarkup(file: string, text: string) {
  text.split('\n').forEach((line, i) => {
    for (const c of line.match(COLOR_RE) ?? [])
      hits.push({
        file,
        line: i + 1,
        category: 'color',
        property: 'attr',
        value: c,
        kind: 'raw-usage',
        context: line.trim().slice(0, 140),
      });
    for (const m of line.matchAll(/\brx="(\d+)"/g))
      hits.push({
        file,
        line: i + 1,
        category: 'radius',
        property: 'rx',
        value: m[1]!,
        kind: 'raw-usage',
        context: line.trim().slice(0, 140),
      });
  });
}

/* ---------------------------------------------------------------- TS / TSX via AST */

function propName(node: ts.Node): string | undefined {
  const p = node.parent;
  if (!p) return;
  if (ts.isPropertyAssignment(p) && p.initializer === node) return p.name.getText();
  if (ts.isJsxAttribute(p)) return p.name.getText();
  if (ts.isJsxExpression(p) && p.parent && ts.isJsxAttribute(p.parent))
    return p.parent.name.getText();
  if (ts.isVariableDeclaration(p) && p.initializer === node) return p.name.getText();
  if (ts.isBinaryExpression(p)) return propName(p);
  if (ts.isArrayLiteralExpression(p)) return propName(p);
  if (ts.isPrefixUnaryExpression(p)) return propName(p);
  return;
}

/** Parent object-property path, e.g. tokens.color.surface → "color.surface". */
function propPath(node: ts.Node): string {
  const parts: string[] = [];
  let n: ts.Node | undefined = node;
  while (n) {
    if (ts.isPropertyAssignment(n)) parts.unshift(n.name.getText().replace(/['"]/g, ''));
    if (ts.isVariableDeclaration(n)) {
      parts.unshift(n.name.getText());
      break;
    }
    n = n.parent;
  }
  return parts.join('.');
}

function scanTs(file: string, text: string) {
  const sf = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    extname(file) === '.tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const theme = isThemeFile(file);
  const add = (node: ts.Node, category: Category, value: string, property: string) => {
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart());
    hits.push({
      file,
      line: line + 1,
      category,
      property: theme ? propPath(node) || property : property,
      value,
      kind: theme ? 'token-definition' : 'raw-usage',
      context: text.split('\n')[line]!.trim().slice(0, 140),
    });
  };
  const visit = (node: ts.Node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const prop = propName(node) ?? '';
      const colors = node.text.match(COLOR_RE);
      if (colors) colors.forEach((c) => add(node, 'color', c, prop));
      else if (/family/i.test(prop) || /sans-serif|serif|monospace/.test(node.text))
        add(node, 'font-family', node.text, prop);
      else if (/^\d+(\.\d+)?(px|em|rem|ms|s)$/.test(node.text))
        add(node, categorize(prop) ?? 'size', node.text, prop);
    } else if (ts.isNumericLiteral(node) && node.text !== '0') {
      const prop = propName(node);
      // Pixel offsets on SVG text/marks in React components (x={LABEL_W - 8}).
      const svgOffset = !!prop && /^(x|y|dx|dy)$/.test(prop) && file.endsWith('.tsx');
      const cat = svgOffset ? 'spacing' : prop ? categorize(prop) : undefined;
      // Skip data-logic numbers (limits, indices, schema bounds) — only design-ish props count.
      if (cat && !/limit|min|max|span|version|height\b.*default/i.test(prop ?? ''))
        add(node, cat, node.text, prop!);
      else if (prop === 'padding' || prop === 'size') add(node, cat ?? 'size', node.text, prop);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

/* ---------------------------------------------------------------- run */

for (const file of SCAN.flatMap(walk)
  .map((f) => relative(ROOT, join(ROOT, f)))
  .sort()) {
  const text = readFileSync(join(ROOT, file), 'utf8');
  const ext = extname(file);
  if (ext === '.css') scanCss(file, text);
  else if (ext === '.ts' || ext === '.tsx') {
    if (!file.endsWith('.d.ts')) scanTs(file, text);
  } else if (ext === '.html' || ext === '.svg') scanMarkup(file, text);
}

// Spec-level hard-coding: layout spans/heights and d3-format strings live in YAML; count them too.
for (const file of walk('dashboards')
  .filter((f) => f.endsWith('.dashboard.yaml'))
  .sort()) {
  readFileSync(join(ROOT, file), 'utf8')
    .split('\n')
    .forEach((line, i) => {
      for (const c of line.match(COLOR_RE) ?? [])
        hits.push({
          file,
          line: i + 1,
          category: 'color',
          property: 'spec',
          value: c,
          kind: 'raw-usage',
          context: line.trim(),
        });
    });
}

const esc = (s: string | number) => {
  const v = String(s);
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};
const header = ['file', 'line', 'category', 'property', 'value', 'kind', 'context'];
const csv =
  [header.join(','), ...hits.map((h) => header.map((k) => esc(h[k as keyof Hit])).join(','))].join(
    '\n',
  ) + '\n';
mkdirSync(dirname(join(ROOT, OUT)), { recursive: true });
writeFileSync(join(ROOT, OUT), csv);

if (process.argv.includes('--summary')) {
  const table = new Map<string, Record<string, number>>();
  for (const h of hits) {
    const row = table.get(h.category) ?? {};
    row[h.kind] = (row[h.kind] ?? 0) + 1;
    table.set(h.category, row);
  }
  console.table(Object.fromEntries([...table].sort()));
  const rawByValue = new Map<string, number>();
  for (const h of hits.filter((h) => h.kind === 'raw-usage'))
    rawByValue.set(
      `${h.category}:${h.value}`,
      (rawByValue.get(`${h.category}:${h.value}`) ?? 0) + 1,
    );
  console.log('distinct raw values:', rawByValue.size);
}
console.log(`wrote ${hits.length} rows to ${OUT}`);
