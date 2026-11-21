import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrast, distance } from '../../scripts/tokens/color-math';
import { flintTheme, lookup, vegaLiteConfig } from '../../scripts/tokens/engines';
import {
  TOKENS_DIR,
  cssVar,
  loadFormats,
  resolveAll,
  resolveSet,
  type ResolvedSet,
} from '../../scripts/tokens/lib';
import { validate } from '../../scripts/tokens/validate';
import { flintTheme as generatedFlint } from '../../src/theme/generated/engines';
import { themes } from '../../src/theme/generated/themes';

/** A writable copy of tokens/ for tests that change the source. */
function tokensCopy(): string {
  const dir = join(mkdtempSync(join(tmpdir(), 'tokens-')), 'tokens');
  cpSync(TOKENS_DIR, dir, { recursive: true });
  return dir;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixtures poke arbitrary JSON
type Doc = Record<string, any>;
function edit(dir: string, file: string, change: (doc: Doc) => void) {
  const path = join(dir, file);
  const doc = JSON.parse(readFileSync(path, 'utf8'));
  change(doc);
  writeFileSync(path, JSON.stringify(doc));
}
const color = (hex: string) => ({
  colorSpace: 'srgb',
  components: [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255),
  hex,
});
/** Replace one resolved colour in a set (for validator tests). */
function withColor(set: ResolvedSet, path: string, hex: string): ResolvedSet {
  const tokens = new Map(set.tokens);
  tokens.set(path, { ...tokens.get(path)!, resolved: hex });
  return { ...set, tokens };
}
const errorsOf = (sets: ResolvedSet[]) =>
  validate(sets)
    .findings.filter((f) => f.level === 'error')
    .map((f) => `[${f.rule}] ${f.message}`);

describe('token source', () => {
  const sets = resolveAll();

  it('resolves every theme × density combination', () => {
    expect(sets.map((s) => `${s.theme}/${s.density}`)).toEqual([
      'light/comfortable',
      'light/compact',
      'dark/comfortable',
      'dark/compact',
      'hc/comfortable',
      'hc/compact',
    ]);
    for (const s of sets) expect(s.tokens.size).toBe(sets[0]!.tokens.size);
  });

  it('passes every validator', () => {
    expect(errorsOf(sets)).toEqual([]);
  });

  it('keeps the semantic and component tiers free of literal values', () => {
    for (const t of sets[0]!.tokens.values())
      if (['semantic', 'component', 'density'].includes(t.tier) && t.type !== 'number')
        expect(t.refs.length, t.path).toBeGreaterThan(0);
  });

  it('names CSS variables predictably, including diverging stops', () => {
    expect(cssVar('color.bg.surface')).toBe('--color-bg-surface');
    expect(cssVar('color.data.diverging.blue-orange.-4')).toBe(
      '--color-data-diverging-blue-orange-m4',
    );
    expect(cssVar('color.data.diverging.blue-orange.+4')).toBe(
      '--color-data-diverging-blue-orange-p4',
    );
  });

  it('exposes valid formats', () => {
    expect(loadFormats().number.currency).toBe('$,.0f');
  });
});

describe('validators catch bad palettes', () => {
  const sets = resolveAll();
  const light = (s: ResolvedSet) => s.theme === 'light' && s.density === 'comfortable';
  const swap = (path: string, hex: string) =>
    sets.map((s) => (light(s) ? withColor(s, path, hex) : s));

  it('flags text below 4.5:1', () => {
    expect(errorsOf(swap('color.text.muted', '#b7b6b0')).join('\n')).toMatch(
      /\[contrast\] light: color.text.muted on color.bg.surface/,
    );
  });

  it('flags categorical colours that collide for colour-blind viewers', () => {
    // A red and a green of similar lightness: distinct in normal vision, not under deuteranopia.
    const errors = errorsOf(
      swap('color.data.categorical.2', '#c94747').map((s) =>
        light(s) ? withColor(s, 'color.data.categorical.3', '#4f8a1f') : s,
      ),
    );
    expect(errors.join('\n')).toMatch(/\[cvd\] light\/(deuteranopia|protanopia): categorical/);
  });

  it('flags a sequential ramp that is not monotonic', () => {
    expect(errorsOf(swap('color.data.sequential.blue.5', '#e4ebfb')).join('\n')).toMatch(
      /\[ramp\] light: sequential.blue/,
    );
  });

  it('flags broken references and orphaned primitives', () => {
    const dir = tokensCopy();
    edit(dir, 'semantic/light.tokens.json', (d) => (d.color.bg.canvas.$value = '{color.nope.1}'));
    expect(() => resolveSet('light', 'comfortable', dir)).toThrow(
      /unknown reference \{color.nope.1\}/,
    );

    const dir2 = tokensCopy();
    edit(
      dir2,
      'primitive/color.tokens.json',
      (d) => (d.color.neutral['999'] = { $value: color('#123456') }),
    );
    expect(
      validate(resolveAll(dir2), dir2)
        .findings.map((f) => f.message)
        .join('\n'),
    ).toMatch(/color.neutral.999 is not referenced/);
  });

  it('flags a hex that disagrees with its components', () => {
    const dir = tokensCopy();
    edit(dir, 'primitive/color.tokens.json', (d) => (d.color.brand['500'].$value.hex = '#000000'));
    expect(() => resolveSet('light', 'comfortable', dir)).toThrow(/does not match components/);
  });
});

describe('rebrand path (Gate 0 decision 4)', () => {
  it('changes the accent everywhere by editing one primitive', () => {
    const dir = tokensCopy();
    edit(
      dir,
      'primitive/color.tokens.json',
      (d) => (d.color.brand['500'].$value = color('#0b6e5f')),
    );
    const set = resolveSet('light', 'comfortable', dir);
    for (const p of [
      'color.bg.accent',
      'color.focus.ring',
      'chip.selected.bg',
      'color.status.info',
    ])
      expect(set.tokens.get(p)!.resolved, p).toBe('#0b6e5f');
    expect(validate(resolveAll(dir), dir).findings.filter((f) => f.level === 'error')).toEqual([]);
  });

  it('refuses a brand colour that breaks contrast', () => {
    const dir = tokensCopy();
    edit(
      dir,
      'primitive/color.tokens.json',
      (d) => (d.color.brand['500'].$value = color('#ffd166')),
    );
    const errors = validate(resolveAll(dir), dir)
      .findings.map((f) => f.message)
      .join('\n');
    expect(errors).toMatch(/color.text.on-accent on color.bg.accent/);
  });
});

describe('engine adapters', () => {
  const light = lookup(resolveSet('light', 'comfortable'));

  it('give Vega-Lite the full palettes', () => {
    const cfg = vegaLiteConfig(light, loadFormats());
    const range = cfg.range as Record<string, string[]>;
    expect(range.category).toHaveLength(10);
    expect(range.ramp).toHaveLength(9);
    expect(range.diverging).toHaveLength(9);
  });

  it('override every Datawrapper ink in the Flint theme', () => {
    const json = JSON.stringify(flintTheme(light, 'light')).toLowerCase();
    for (const ink of ['#181818', '#18a1cd', '#c71e1d', '#747474', '#888888', '#e7e7e7'])
      expect(json).not.toContain(ink);
  });

  it('are what the generated module exports', () => {
    expect(generatedFlint.light).toEqual(flintTheme(light, 'light'));
  });
});

describe('generated themes', () => {
  it('keep sign colours apart and readable in every theme', () => {
    for (const t of Object.values(themes)) {
      const { positive, negative } = t.color.data;
      expect(distance(positive, negative, 'deuteranopia')).toBeGreaterThan(10);
      expect(contrast(positive, t.color.bg.surface)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
