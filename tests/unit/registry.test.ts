import { describe, expect, it } from 'vitest';
import { coverage, coverageErrors, loadItems, storyId } from '../../scripts/catalog/build';
import { buildRegistry, closure, importsOf } from '../../scripts/registry/build';

describe('registry import graph', () => {
  it('tells runtime imports from type-only ones', () => {
    const found = importsOf(`
      import { a } from './a';
      import type { B } from 'b-types';
      export { c } from '../c';
      type P = typeof import('plotly.js');
      const lazy = () => import('vega-embed');
    `);
    expect(found).toEqual([
      { spec: './a', typeOnly: false },
      { spec: 'b-types', typeOnly: true },
      { spec: '../c', typeOnly: false },
      { spec: 'plotly.js', typeOnly: true },
      { spec: 'vega-embed', typeOnly: false },
    ]);
  });

  it('ships a button with its props file and cn, and only runtime packages', () => {
    const { files, packages, typePackages } = closure(['src/components/ui/button.tsx']);
    expect(files).toEqual([
      'docs/lld/button.props.ts',
      'src/components/ui/button.tsx',
      'src/lib/cn.ts',
    ]);
    expect(packages).toEqual([
      '@base-ui/react',
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
    ]);
    // The automatic JSX runtime means button imports React for types only.
    expect(typePackages).toEqual(['react']);
  });

  it('adds ambient declarations and @types for packages that need them', () => {
    const { items } = loadItems();
    const chart = buildRegistry(items).items.find((i) => i.name === 'chart-panel')!;
    const paths = chart.files.map((f) => f.path);
    expect(paths).toContain('src/types/plotly-basic.d.ts');
    expect('devDependencies' in chart && chart.devDependencies).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^@types\/d3@/),
        expect.stringMatching(/^vega-lite@/),
      ]),
    );
    // Every file installs under factory/ with its repo path, so relative imports still resolve.
    for (const f of chart.files) expect(f.target).toBe(`~/factory/${f.path}`);
  });
});

describe('catalog coverage (Gate 5)', () => {
  it('derives Storybook ids from story titles', () => {
    expect(storyId('Atoms/DeltaIndicator')).toBe('atoms-deltaindicator');
    expect(storyId('Templates/DashboardTemplate')).toBe('templates-dashboardtemplate');
  });

  it('every built item has a story and a registry entry', () => {
    const { items } = loadItems();
    expect(coverageErrors(items, coverage(items))).toEqual([]);
  });

  it('reports a built item without a story or registry entry', () => {
    const { items } = loadItems();
    const ghost = { ...items.find((i) => i.id === 'button')!, id: 'ghost-button' };
    const errors = coverageErrors([ghost], coverage([ghost])).join('\n');
    expect(errors).toMatch(/ghost-button.md: built but has no story/);
    expect(errors).toMatch(/ghost-button.md: built but not in registry/);
  });
});
