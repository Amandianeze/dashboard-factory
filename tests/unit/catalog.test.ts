import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { crossChecks, loadItems } from '../../scripts/catalog/build';
import { CatalogItem, LLD_SECTIONS } from '../../scripts/catalog/schema';
import { sectionErrors } from '../../scripts/lld/check';
import { listSpecFiles } from '../../scripts/lib/specs';
import { PANEL_KINDS } from '../../src/spec/generated/panel-kinds';
import { PanelSpec } from '../../src/spec/schema';
import { validateDashboard } from '../../src/spec/validate';

/** The Phase 4 fields a built item needs, with no files to point at (props null → not React). */
const LLD_FIELDS = {
  renderEngine: 'd3',
  package: '@factory/ui',
  figmaNode: null,
  tokens: [],
  props: null,
  dataContract: null,
  a11y: { role: 'img', keyboard: 'n/a', srSummary: 'n/a', minContrast: 3 },
  motion: null,
  perfBudget: { renderMs: 1, bundleKb: 1 },
  tests: ['unit'],
  references: ['https://example.com/'],
  adr: [],
};

const item = (over: Record<string, unknown>) =>
  CatalogItem.parse({
    id: 'thing',
    name: 'Thing',
    summary: 'A thing.',
    atomicLevel: 'atom',
    biLevel: null,
    status: 'beta',
    source: ['package.json'],
    ...LLD_FIELDS,
    registryItem: `@factory/${String(over.id ?? 'thing')}`,
    ...over,
  });

describe('catalog front matter (docs/lld)', () => {
  it('loads every item with no errors', () => {
    const { items, errors } = loadItems();
    expect(errors).toEqual([]);
    expect(items.length).toBeGreaterThan(0);
  });

  it('requires a gap and no source on proposed items', () => {
    const r = CatalogItem.safeParse({
      ...item({}),
      status: 'proposed',
      source: ['package.json'],
    });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toMatch(/need a gap/);
    expect(JSON.stringify(r.error?.issues)).toMatch(/no implementation yet/);
  });

  it('only lets organisms be a panel kind', () => {
    const r = CatalogItem.safeParse({ ...item({}), panel: { renderers: ['kpi'] } });
    expect(JSON.stringify(r.error?.issues)).toMatch(/only organisms/);
  });

  it('composes down the ladder only, and never from a proposed item', () => {
    const atom = item({ id: 'atom-a' });
    const gap = item({
      id: 'gap-a',
      status: 'proposed',
      source: [],
      gap: { priority: 'P2', reason: 'x' },
    });
    const molecule = item({ id: 'mol', atomicLevel: 'molecule', composes: ['atom-a', 'gap-a'] });
    const wrongWay = item({ id: 'up', composes: ['mol'] });
    const errors = crossChecks([atom, gap, molecule, wrongWay]).join('\n');
    expect(errors).toMatch(/can't be built from the proposed item "gap-a"/);
    expect(errors).toMatch(/an? atom can't compose the molecule "mol"/);
  });

  it('flags missing source files and unknown parts', () => {
    const errors = crossChecks([item({ source: ['nope.tsx'], composes: ['ghost'] })]).join('\n');
    expect(errors).toMatch(/"nope.tsx" does not exist/);
    expect(errors).toMatch(/unknown item "ghost"/);
  });
});

describe('panel kind ↔ renderer contract', () => {
  const renderers = PanelSpec.options.map((o) => o.shape.renderer.value as string);
  const allowed = Object.values(PANEL_KINDS).flatMap((k) => k.renderers as readonly string[]);

  it('every renderer belongs to exactly one panel kind', () => {
    for (const r of renderers) expect(allowed.filter((a) => a === r)).toHaveLength(1);
  });

  it('every kind lists only renderers the schema has', () => {
    for (const r of allowed) expect(renderers).toContain(r);
  });

  const example = () =>
    parse(
      readFileSync(
        listSpecFiles().find((f) => f.includes('revenue-overview'))!,
        'utf8',
      ),
    );
  const errorsFor = (spec: unknown) => {
    const r = validateDashboard(spec);
    return r.ok ? '' : r.errors.join('\n');
  };

  it('rejects a kind that does not allow the renderer', () => {
    const s = example();
    s.panels.trend.kind = 'kpi-card';
    expect(errorsFor(s)).toMatch(/kind "kpi-card" renders with kpi, not "vega-lite"/);
  });

  it('rejects a proposed organism as a kind until it is built', () => {
    const s = example();
    s.panels.trend.kind = 'data-table';
    expect(errorsFor(s)).toMatch(/kind/);
  });

  it('requires a kind on every panel', () => {
    const s = example();
    delete s.panels.trend.kind;
    expect(errorsFor(s)).toMatch(/kind/);
  });
});

describe('LLD rules (Phase 4)', () => {
  const full = (over: Record<string, unknown> = {}) => ({
    id: 'thing',
    name: 'Thing',
    summary: 'A thing.',
    atomicLevel: 'atom',
    biLevel: null,
    status: 'beta',
    renderEngine: 'react',
    source: ['package.json'],
    package: '@factory/ui',
    registryItem: '@factory/thing',
    figmaNode: null,
    tokens: ['color.text.primary'],
    props: './thing.props.ts',
    dataContract: null,
    a11y: { role: 'button', keyboard: 'Enter', srSummary: 'n/a', minContrast: 4.5 },
    motion: null,
    perfBudget: { renderMs: 1, bundleKb: 1 },
    tests: ['unit'],
    references: ['https://example.com/'],
    adr: ['ADR-003'],
    ...over,
  });
  const issues = (input: unknown) => JSON.stringify(CatalogItem.safeParse(input).error?.issues);

  it('accepts a complete built item', () => {
    expect(CatalogItem.safeParse(full()).success).toBe(true);
  });

  it('requires every LLD field on built items and P1/P2 gaps', () => {
    const noA11y: Record<string, unknown> = full();
    delete noA11y.a11y;
    expect(issues(noA11y)).toMatch(/a11y.*needs a full LLD/);
  });

  it('keeps P3 stubs to taxonomy fields', () => {
    const stub = full({ status: 'proposed', source: [], gap: { priority: 'P3', reason: 'later' } });
    expect(issues(stub)).toMatch(/P3 stubs carry taxonomy fields only/);
  });

  it('pins registryItem and props to the id', () => {
    expect(issues(full({ registryItem: '@factory/other' }))).toMatch(/@factory\/thing/);
    expect(issues(full({ props: './other.props.ts' }))).toMatch(/thing\.props\.ts/);
    expect(issues(full({ props: null }))).toMatch(/React item has a props interface/);
  });

  it('rejects primitive tokens, unknown tokens and newTokens that already exist', () => {
    const item = CatalogItem.parse(
      full({
        tokens: ['palette.categorical.light.1', 'nope.token'],
        newTokens: ['color.text.primary'],
        props: null,
        renderEngine: 'vega-lite',
      }),
    );
    const errors = crossChecks([item]).join('\n');
    expect(errors).toMatch(/"palette.categorical.light.1" is dataviz-tier/);
    expect(errors).toMatch(/"nope.token" does not exist/);
    expect(errors).toMatch(/newTokens "color.text.primary" already exists/);
  });

  it('checks that props files, data contracts and ADRs exist', () => {
    const item = CatalogItem.parse(
      full({ dataContract: 'src/spec/schema.ts#Nope', adr: ['ADR-999'] }),
    );
    const errors = crossChecks([item]).join('\n');
    expect(errors).toMatch(/thing\.props\.ts does not exist/);
    expect(errors).toMatch(/no export named Nope/);
    expect(errors).toMatch(/ADR-999 not found/);
  });

  it('requires the template sections in order', () => {
    const body = (s: string[]) => `---\nid: x\n---\n${s.map((h) => `## ${h}\n`).join('')}`;
    expect(sectionErrors(body([...LLD_SECTIONS]))).toEqual([]);
    const swapped = [...LLD_SECTIONS];
    [swapped[0], swapped[1]] = [swapped[1]!, swapped[0]!];
    expect(sectionErrors(body(swapped)).join()).toMatch(/out of order/);
    expect(sectionErrors(body(LLD_SECTIONS.slice(1))).join()).toMatch(
      /missing section "## Purpose"/,
    );
  });
});
