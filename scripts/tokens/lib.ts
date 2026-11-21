/**
 * DTCG 2025.10 token loader and resolver (https://www.designtokens.org/tr/2025.10/format/).
 *
 * Sets, merged per theme × density:
 *   base     tokens/primitive/*, tokens/dataviz/*, tokens/motion.tokens.json,
 *            tokens/semantic/base.tokens.json, tokens/component/*
 *   theme    tokens/semantic/<theme>.tokens.json   (light | dark | hc)
 *   density  tokens/density/<density>.tokens.json  (comfortable | compact)
 *
 * Supported types: color (srgb), dimension (px | rem), fontFamily, fontWeight, duration,
 * cubicBezier, number, typography. Anything else is an error, so an unsupported token can't slip
 * into an output unnoticed. This is the only module that knows the DTCG format.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { z } from 'zod';
import { rgbToHex, type RGB } from './color-math';

export const ROOT = process.cwd();
export const TOKENS_DIR = join(ROOT, 'tokens');
export const THEMES = ['light', 'dark', 'hc'] as const;
export const DENSITIES = ['comfortable', 'compact'] as const;
export type Theme = (typeof THEMES)[number];
export type Density = (typeof DENSITIES)[number];

export type TokenType =
  | 'color'
  | 'dimension'
  | 'fontFamily'
  | 'fontWeight'
  | 'duration'
  | 'cubicBezier'
  | 'number'
  | 'typography';
const TYPES = new Set<TokenType>([
  'color',
  'dimension',
  'fontFamily',
  'fontWeight',
  'duration',
  'cubicBezier',
  'number',
  'typography',
]);

export type Tier = 'primitive' | 'dataviz' | 'motion' | 'semantic' | 'component' | 'density';

export interface RawToken {
  path: string;
  type: TokenType | undefined;
  value: unknown;
  description?: string;
  file: string;
  tier: Tier;
}

export interface Typography {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  letterSpacing: number;
  lineHeight: number;
}
/** Resolved JS value: colour → hex, dimension → px number, duration → ms, family → CSS stack. */
export type Resolved = string | number | number[] | Typography;

export interface Token extends RawToken {
  type: TokenType;
  resolved: Resolved;
  /** Paths this token's value references directly. */
  refs: string[];
}

/* ------------------------------------------------------------------ loading */

function listJson(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.tokens.json'))
    .sort()
    .map((f) => join(dir, f));
}

function tierOf(file: string, dir: string): Tier {
  const rel = relative(dir, file);
  if (rel.startsWith('primitive/')) return 'primitive';
  if (rel.startsWith('dataviz/')) return 'dataviz';
  if (rel.startsWith('component/')) return 'component';
  if (rel.startsWith('density/')) return 'density';
  if (rel.startsWith('semantic/')) return 'semantic';
  return 'motion';
}

const isRef = (v: unknown): v is string => typeof v === 'string' && /^\{[^{}]+\}$/.test(v);
const refPath = (v: string) => v.slice(1, -1);

/** Flatten one DTCG document into tokens, applying group `$type` inheritance. */
export function flattenFile(file: string, dir = TOKENS_DIR): RawToken[] {
  const doc = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
  const out: RawToken[] = [];
  const tier = tierOf(file, dir);
  const walk = (node: Record<string, unknown>, path: string[], inherited?: string) => {
    const groupType = (node.$type as string | undefined) ?? inherited;
    if ('$value' in node) {
      out.push({
        path: path.join('.'),
        type: groupType as TokenType | undefined,
        value: node.$value,
        description: node.$description as string | undefined,
        file: relative(ROOT, file),
        tier,
      });
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith('$')) continue;
      if (/[{}.]/.test(k)) throw new Error(`${relative(ROOT, file)}: invalid token name "${k}"`);
      if (v && typeof v === 'object' && !Array.isArray(v))
        walk(v as Record<string, unknown>, [...path, k], groupType);
    }
  };
  walk(doc, []);
  return out;
}

export function baseFiles(dir = TOKENS_DIR): string[] {
  return [
    ...listJson(join(dir, 'primitive')),
    ...listJson(join(dir, 'dataviz')),
    ...listJson(dir),
    join(dir, 'semantic', 'base.tokens.json'),
    ...listJson(join(dir, 'component')),
  ];
}
export const themeFile = (t: Theme, dir = TOKENS_DIR) => join(dir, 'semantic', `${t}.tokens.json`);
export const densityFile = (d: Density, dir = TOKENS_DIR) =>
  join(dir, 'density', `${d}.tokens.json`);

/* ---------------------------------------------------------------- resolving */

const ColorValue = z
  .object({
    colorSpace: z.literal('srgb'),
    components: z.tuple([z.number(), z.number(), z.number()]),
    alpha: z.number().min(0).max(1).optional(),
    hex: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
  })
  .strict();
const DimensionValue = z.object({ value: z.number(), unit: z.enum(['px', 'rem']) }).strict();
const DurationValue = z.object({ value: z.number().min(0), unit: z.enum(['ms', 's']) }).strict();

function literal(type: TokenType, v: unknown, where: string): Resolved {
  const fail = (msg: string): never => {
    throw new Error(`${where}: ${msg}`);
  };
  switch (type) {
    case 'color': {
      const r = ColorValue.safeParse(v);
      if (!r.success) fail(`invalid color value (${r.error.issues[0]?.message})`);
      const c = r.data!;
      const hex = rgbToHex(c.components as RGB);
      if (c.hex && c.hex.toLowerCase() !== hex)
        fail(`hex ${c.hex} does not match components (${hex}); edit both together`);
      if (c.alpha !== undefined && c.alpha < 1)
        return `rgba(${c.components.map((x) => Math.round(x * 255)).join(', ')}, ${c.alpha})`;
      return hex;
    }
    case 'dimension': {
      const r = DimensionValue.safeParse(v);
      if (!r.success) fail('invalid dimension (expected { value, unit: px | rem })');
      return r.data!.unit === 'rem' ? r.data!.value * 16 : r.data!.value;
    }
    case 'duration': {
      const r = DurationValue.safeParse(v);
      if (!r.success) fail('invalid duration (expected { value, unit: ms | s })');
      return r.data!.unit === 's' ? r.data!.value * 1000 : r.data!.value;
    }
    case 'fontFamily': {
      const list = Array.isArray(v) ? v : [v];
      if (!list.every((x) => typeof x === 'string'))
        fail('fontFamily must be a string or string[]');
      return (list as string[])
        .map((f) => (/^[\w-]+$/.test(f) && !/\s/.test(f) ? f : `"${f}"`))
        .join(', ');
    }
    case 'fontWeight': {
      if (typeof v !== 'number' || v < 1 || v > 1000) fail('fontWeight must be a number 1–1000');
      return v as number;
    }
    case 'number':
      if (typeof v !== 'number') fail('number token must be a number');
      return v as number;
    case 'cubicBezier': {
      if (!Array.isArray(v) || v.length !== 4 || !v.every((x) => typeof x === 'number'))
        fail('cubicBezier must be [x1, y1, x2, y2]');
      const [x1, , x2] = v as number[];
      if (x1! < 0 || x1! > 1 || x2! < 0 || x2! > 1) fail('cubicBezier x values must be in [0, 1]');
      return v as number[];
    }
    case 'typography':
      return fail('typography is resolved field by field');
  }
}

export interface ResolvedSet {
  theme: Theme;
  density: Density;
  tokens: Map<string, Token>;
}

/** Merge files and resolve every token. Throws on conflicts, cycles, bad refs and bad values. */
export function resolveSet(theme: Theme, density: Density, dir = TOKENS_DIR): ResolvedSet {
  const raw = new Map<string, RawToken>();
  for (const file of [...baseFiles(dir), themeFile(theme, dir), densityFile(density, dir)])
    for (const t of flattenFile(file, dir)) {
      const prev = raw.get(t.path);
      if (prev) throw new Error(`${t.file}: "${t.path}" is already defined in ${prev.file}`);
      raw.set(t.path, t);
    }

  const done = new Map<string, Token>();
  const resolve = (path: string, stack: string[]): Token => {
    const hit = done.get(path);
    if (hit) return hit;
    const t = raw.get(path);
    if (!t) throw new Error(`unknown reference {${path}} (from ${stack.at(-1) ?? '?'})`);
    if (stack.includes(path)) throw new Error(`reference cycle: ${[...stack, path].join(' → ')}`);
    const where = `${t.file}: ${path}`;
    const next = [...stack, path];
    let type = t.type;
    let resolved: Resolved;
    const refs: string[] = [];

    if (isRef(t.value)) {
      const target = resolve(refPath(t.value), next);
      refs.push(target.path);
      if (type && type !== target.type)
        throw new Error(`${where}: $type ${type} but references a ${target.type}`);
      type = target.type;
      resolved = target.resolved;
    } else {
      if (!type) throw new Error(`${where}: no $type (DTCG: the token is invalid)`);
      if (!TYPES.has(type)) throw new Error(`${where}: unsupported $type "${type}"`);
      if (type === 'typography') {
        const v = t.value as Record<string, unknown>;
        const field = <K extends keyof Typography>(k: K, ftype: TokenType): number | string => {
          const fv = v?.[k];
          if (fv === undefined) throw new Error(`${where}: typography needs ${k}`);
          if (isRef(fv)) {
            const target = resolve(refPath(fv), next);
            refs.push(target.path);
            if (target.type !== ftype)
              throw new Error(`${where}: ${k} references a ${target.type}, needs ${ftype}`);
            return target.resolved as number | string;
          }
          return literal(ftype, fv, `${where}.${k}`) as number | string;
        };
        resolved = {
          fontFamily: field('fontFamily', 'fontFamily') as string,
          fontSize: field('fontSize', 'dimension') as number,
          fontWeight: field('fontWeight', 'fontWeight') as number,
          letterSpacing: field('letterSpacing', 'dimension') as number,
          lineHeight: field('lineHeight', 'number') as number,
        };
      } else resolved = literal(type, t.value, where);
    }
    const token: Token = { ...t, type: type!, resolved, refs };
    done.set(path, token);
    return token;
  };
  for (const path of raw.keys()) resolve(path, []);
  return { theme, density, tokens: done };
}

/** Every theme × density combination, resolved. */
export function resolveAll(dir = TOKENS_DIR): ResolvedSet[] {
  return THEMES.flatMap((t) => DENSITIES.map((d) => resolveSet(t, d, dir)));
}

/* ------------------------------------------------------------------ formats */

export const FormatFile = z
  .object({
    $description: z.string().optional(),
    number: z.record(z.string().min(1)),
    date: z.record(z.string().min(1)),
  })
  .strict();
export type Formats = Omit<z.infer<typeof FormatFile>, '$description'>;

export function loadFormats(dir = TOKENS_DIR): Formats {
  const { number, date } = FormatFile.parse(
    JSON.parse(readFileSync(join(dir, 'format.json'), 'utf8')),
  );
  return { number, date };
}

/* -------------------------------------------------------------------- utils */

/** Nested object from dotted paths, for typed TS output. */
export function nest(entries: [string, unknown][]): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const [path, value] of entries) {
    const keys = path.split('.');
    let node = root;
    keys.slice(0, -1).forEach((k) => (node = (node[k] ??= {}) as Record<string, unknown>));
    node[keys.at(-1)!] = value;
  }
  return root;
}

/** CSS custom property name for a token path: color.data.diverging.blue-orange.-4 → --color-data-diverging-blue-orange-m4 */
export const cssVar = (path: string) =>
  '--' +
  path
    .split('.')
    .map((s) => s.replace(/^-/, 'm').replace(/^\+/, 'p'))
    .join('-');
