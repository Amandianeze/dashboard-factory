import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { crossChecks, loadItems } from '../../scripts/catalog/build';
import { CatalogItem } from '../../scripts/catalog/schema';
import { listSpecFiles } from '../../scripts/lib/specs';
import { PANEL_KINDS } from '../../src/spec/generated/panel-kinds';
import { PanelSpec } from '../../src/spec/schema';
import { validateDashboard } from '../../src/spec/validate';

const item = (over: Record<string, unknown>) =>
  CatalogItem.parse({
    id: 'thing',
    name: 'Thing',
    summary: 'A thing.',
    atomicLevel: 'atom',
    biLevel: null,
    status: 'beta',
    renderEngine: 'react',
    source: ['package.json'],
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
