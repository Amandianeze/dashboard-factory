/**
 * Token validators (ADR-001 sets the thresholds). Fails on any error; writes the contrast matrix.
 *
 *   npm run tokens:validate             # check + write docs/tokens/contrast-matrix.md
 *   npm run tokens:validate -- --quiet  # check only (used by verify)
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { formatSpecifier, utcFormat } from 'd3';
import { closestPair, contrast, distance, hexToLab, VISIONS } from './color-math';
import {
  DENSITIES,
  THEMES,
  densityFile,
  flattenFile,
  loadFormats,
  resolveAll,
  themeFile,
  type ResolvedSet,
  type Theme,
} from './lib';

/* Thresholds — change only with an ADR-001 amendment. */
export const RULES = {
  text: { normal: 4.5, hc: 7 },
  nonText: 3,
  categorical: { first8: 10, all: 8, count: 10 },
  signSeparation: 10,
  sequential: { firstStopVsSurface: 5, stepRatio: [0.5, 1.5] as const },
  divergingArmMismatchL: 10,
} as const;

export interface Finding {
  level: 'error' | 'warning';
  rule: string;
  message: string;
}
interface ContrastRow {
  theme: Theme;
  fg: string;
  bg: string;
  fgHex: string;
  bgHex: string;
  ratio: number;
  need: number;
}

export function validate(
  sets: ResolvedSet[] = resolveAll(),
  dir?: string,
): {
  findings: Finding[];
  matrix: ContrastRow[];
} {
  const findings: Finding[] = [];
  const err = (rule: string, message: string) => findings.push({ level: 'error', rule, message });
  const warn = (rule: string, message: string) =>
    findings.push({ level: 'warning', rule, message });
  const matrix: ContrastRow[] = [];

  /* 1. mode parity */
  const keys = (f: string) =>
    flattenFile(f, dir)
      .map((t) => t.path)
      .sort();
  const parity = (files: string[], label: string) => {
    const [first, ...rest] = files.map(keys);
    rest.forEach((k, i) => {
      const missing = first!.filter((p) => !k.includes(p));
      const extra = k.filter((p) => !first!.includes(p));
      if (missing.length || extra.length)
        err(
          'mode-parity',
          `${label} ${files[i + 1]} differs from ${files[0]}: missing [${missing.join(', ')}], extra [${extra.join(', ')}]`,
        );
    });
  };
  parity(
    THEMES.map((t) => themeFile(t, dir)),
    'theme',
  );
  parity(
    DENSITIES.map((d) => densityFile(d, dir)),
    'density',
  );

  /* 2. tiers: semantic, component and density tokens must be references */
  for (const set of sets.slice(0, 1).concat(sets.filter((s) => s.density === 'compact')))
    for (const t of set.tokens.values()) {
      if (!['semantic', 'component', 'density'].includes(t.tier)) continue;
      if (t.refs.length) continue;
      if (t.type === 'number') continue;
      err('tier', `${t.file}: ${t.path} has a literal value; reference a primitive instead`);
    }

  /* 3. orphans: primitives nobody references, in any mode */
  const referenced = new Set(sets.flatMap((s) => [...s.tokens.values()].flatMap((t) => t.refs)));
  for (const t of sets[0]!.tokens.values())
    if ((t.tier === 'primitive' || t.tier === 'dataviz') && !referenced.has(t.path))
      err('orphan', `${t.file}: ${t.path} is not referenced by any token`);

  /* 4. per theme: contrast, CVD, ramps */
  for (const set of sets.filter((s) => s.density === 'comfortable')) {
    const { theme } = set;
    const hex = (p: string) => {
      const v = set.tokens.get(p)?.resolved;
      if (typeof v !== 'string') throw new Error(`${theme}: ${p} is not a colour`);
      return v;
    };
    const textMin = theme === 'hc' ? RULES.text.hc : RULES.text.normal;
    const check = (fg: string, bg: string, need: number) => {
      const ratio = contrast(hex(fg), hex(bg));
      matrix.push({ theme, fg, bg, fgHex: hex(fg), bgHex: hex(bg), ratio, need });
      if (ratio + 1e-9 < need)
        err(
          'contrast',
          `${theme}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1, needs ${need}:1 (${hex(fg)} on ${hex(bg)})`,
        );
    };
    const backgrounds = ['color.bg.canvas', 'color.bg.surface', 'color.bg.surface-raised'];
    for (const bg of backgrounds) {
      for (const fg of [
        'color.text.primary',
        'color.text.muted',
        'color.text.link',
        'color.text.danger',
      ])
        check(fg, bg, textMin);
      check('color.border.control', bg, RULES.nonText);
      check('color.focus.ring', bg, RULES.nonText);
    }
    for (const bg of ['color.bg.accent', 'color.bg.accent-hover'])
      check('color.text.on-accent', bg, textMin);
    for (const s of ['danger', 'warning', 'success', 'info'])
      check(`color.status.${s}`, 'color.bg.surface', RULES.nonText);
    for (const s of ['positive', 'negative']) check(`color.data.${s}`, 'color.bg.surface', textMin);
    check('color.data.reference-line', 'color.bg.surface', RULES.nonText);

    // Component pairs: every *.text against its sibling bg, else the surface it sits on.
    for (const t of set.tokens.values()) {
      if (t.tier !== 'component' || t.type !== 'color' || !/(^|\.)text$/.test(t.path)) continue;
      const group = t.path.replace(/\.text$/, '');
      const candidates = [`${group}.bg`, `${group.split('.').slice(0, -1).join('.')}.bg`];
      const bg = candidates.find((c) => set.tokens.has(c)) ?? 'color.bg.surface';
      check(t.path, bg, textMin);
    }

    // Categorical: count, contrast, CVD separation.
    const cat = Array.from({ length: RULES.categorical.count }, (_, i) =>
      hex(`color.data.categorical.${i + 1}`),
    );
    cat.forEach((_, i) =>
      check(`color.data.categorical.${i + 1}`, 'color.bg.surface', RULES.nonText),
    );
    for (const v of VISIONS) {
      const all = closestPair(cat, v);
      const first8 = closestPair(cat.slice(0, 8), v);
      if (first8.delta < RULES.categorical.first8)
        err(
          'cvd',
          `${theme}/${v}: categorical ${first8.i + 1} and ${first8.j + 1} are ΔE₀₀ ${first8.delta.toFixed(1)} apart, first 8 need ≥ ${RULES.categorical.first8}`,
        );
      if (all.delta < RULES.categorical.all)
        err(
          'cvd',
          `${theme}/${v}: categorical ${all.i + 1} and ${all.j + 1} are ΔE₀₀ ${all.delta.toFixed(1)} apart, all need ≥ ${RULES.categorical.all}`,
        );
    }
    const pos = hex('color.data.positive');
    const neg = hex('color.data.negative');
    for (const v of VISIONS) {
      const d = distance(pos, neg, v);
      if (d < RULES.signSeparation)
        err(
          'cvd',
          `${theme}/${v}: positive and negative are ΔE₀₀ ${d.toFixed(1)} apart, need ≥ ${RULES.signSeparation}`,
        );
    }

    // Sequential ramps: monotonic lightness away from the surface, even steps, visible first stop.
    const surface = hex('color.bg.surface');
    const surfaceL = hexToLab(surface)[0];
    const seqNames = new Set(
      [...set.tokens.keys()]
        .filter((p) => p.startsWith('color.data.sequential.'))
        .map((p) => p.split('.')[3]!),
    );
    for (const name of seqNames) {
      const stops = [...set.tokens.keys()]
        .filter((p) => p.startsWith(`color.data.sequential.${name}.`))
        .sort((a, b) => Number(a.split('.').at(-1)) - Number(b.split('.').at(-1)))
        .map(hex);
      const L = stops.map((s) => hexToLab(s)[0]);
      const dir = Math.sign(L.at(-1)! - L[0]!);
      // The ramp must run away from the surface: stop 1 nearest it in lightness.
      if (Math.sign(L[0]! - surfaceL) !== dir && Math.abs(L[0]! - surfaceL) > 1)
        err(
          'ramp',
          `${theme}: sequential.${name} starts on the wrong side of the surface lightness`,
        );
      const steps = L.slice(1).map((l, i) => (l - L[i]!) * dir);
      const mean = steps.reduce((a, b) => a + b, 0) / steps.length;
      steps.forEach((s, i) => {
        if (s <= 0)
          err('ramp', `${theme}: sequential.${name} lightness is not monotonic at stop ${i + 2}`);
        else if (
          s < mean * RULES.sequential.stepRatio[0] ||
          s > mean * RULES.sequential.stepRatio[1]
        )
          err(
            'ramp',
            `${theme}: sequential.${name} step ${i + 1}→${i + 2} is ${s.toFixed(1)} L*, mean ${mean.toFixed(1)}`,
          );
      });
      const first = distance(stops[0]!, surface);
      if (first < RULES.sequential.firstStopVsSurface)
        err(
          'ramp',
          `${theme}: sequential.${name}.1 is ΔE₀₀ ${first.toFixed(1)} from the surface, needs ≥ ${RULES.sequential.firstStopVsSurface}`,
        );
    }

    // Diverging ramps: the two arms mirror each other in lightness.
    const divNames = new Set(
      [...set.tokens.keys()]
        .filter((p) => p.startsWith('color.data.diverging.'))
        .map((p) => p.split('.')[3]!),
    );
    for (const name of divNames) {
      const L = (k: string) => hexToLab(hex(`color.data.diverging.${name}.${k}`))[0];
      for (const k of [1, 2, 3, 4]) {
        const gap = Math.abs(L(`-${k}`) - L(`+${k}`));
        if (gap > RULES.divergingArmMismatchL)
          err('ramp', `${theme}: diverging.${name} ±${k} differ by ${gap.toFixed(1)} L*`);
      }
    }
  }

  /* 5. formats */
  const formats = loadFormats(dir);
  for (const [k, spec] of Object.entries(formats.number))
    try {
      formatSpecifier(spec);
    } catch {
      err('format', `format.number.${k}: invalid d3-format "${spec}"`);
    }
  for (const [k, spec] of Object.entries(formats.date))
    if (utcFormat(spec)(new Date(Date.UTC(2026, 0, 5, 13, 7))).includes('%'))
      err('format', `format.date.${k}: "${spec}" leaves an unknown directive`);

  if (!findings.length && !matrix.length) warn('empty', 'nothing validated');
  return { findings, matrix };
}

function writeMatrix(matrix: ContrastRow[]) {
  const lines = [
    '# Contrast matrix (generated)',
    '',
    'Generated by `npm run tokens:validate`. Do not edit. Thresholds: ADR-001.',
    '',
  ];
  for (const theme of THEMES) {
    lines.push(
      `## ${theme}`,
      '',
      '| Foreground | Background | Ratio | Needs | |',
      '| --- | --- | --- | --- | --- |',
    );
    for (const r of matrix.filter((m) => m.theme === theme))
      lines.push(
        `| \`${r.fg}\` ${r.fgHex} | \`${r.bg}\` ${r.bgHex} | ${r.ratio.toFixed(2)} | ${r.need} | ${r.ratio + 1e-9 >= r.need ? 'pass' : '**fail**'} |`,
      );
    lines.push('');
  }
  mkdirSync('docs/tokens', { recursive: true });
  writeFileSync('docs/tokens/contrast-matrix.md', lines.join('\n'));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let result;
  try {
    result = validate();
  } catch (e) {
    console.error(`✗ tokens: ${(e as Error).message}`);
    process.exit(1);
  }
  const { findings, matrix } = result;
  if (!process.argv.includes('--quiet')) writeMatrix(matrix);
  for (const f of findings)
    console[f.level === 'error' ? 'error' : 'warn'](
      `${f.level === 'error' ? '✗' : '!'} [${f.rule}] ${f.message}`,
    );
  const errors = findings.filter((f) => f.level === 'error').length;
  console.log(
    `${errors ? '✗' : '✓'} tokens: ${matrix.length} contrast pairs, ${errors} error(s), ${findings.length - errors} warning(s)`,
  );
  process.exit(errors ? 1 : 0);
}
