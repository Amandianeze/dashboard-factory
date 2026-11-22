import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { check, lintAll, renderFile, splitDesignMd, SECTIONS } from '../../scripts/design-md/cli';
import { buildFrontMatter, COMPONENTS } from '../../scripts/design-md/frontmatter';
import { themes } from '../../src/theme/generated/themes';

const text = readFileSync('DESIGN.md', 'utf8');

describe('DESIGN.md', () => {
  it('lints clean with every section in order', () => {
    expect(lintAll(text)).toEqual({ errors: [], warnings: [] });
  });

  it('has current front matter that round-trips through the DTCG export', async () => {
    expect(await check(text)).toEqual([]);
  });

  it('is stable under its own formatter (build is idempotent)', async () => {
    expect(await renderFile(splitDesignMd(text).body)).toBe(text);
  });

  it('carries the light theme values from tokens', () => {
    const fm = parse(splitDesignMd(text).front) as ReturnType<typeof buildFrontMatter>;
    expect(fm.colors.primary).toBe(themes.light.color.bg.accent);
    expect(fm.colors['data-negative']).toBe(themes.light.color.data.negative);
    expect(fm.typography.display!.fontFeature).toBe('"tnum"');
  });

  it('gives every chip state its own component key', () => {
    const names = COMPONENTS.map(([n]) => n);
    for (const v of [
      'chip',
      'chip-hover',
      'chip-pressed',
      'chip-selected',
      'chip-selected-hover',
      'chip-disabled',
    ])
      expect(names).toContain(v);
  });

  it('reports sections out of order and missing sections', () => {
    const { front, body } = splitDesignMd(text);
    const swapped = body
      .replace('## Colors', '## __tmp')
      .replace('## Typography', '## Colors')
      .replace('## __tmp', '## Typography');
    expect(lintAll(`---\n${front}\n---\n${swapped}`).errors.join('\n')).toMatch(/out of order/);
    const missing = body.replace(/## Motion\n[\s\S]*?(?=\n## )/, '');
    expect(lintAll(`---\n${front}\n---\n${missing}`).errors.join('\n')).toMatch(
      /missing sections: Motion/,
    );
    expect(SECTIONS).toHaveLength(12);
  });

  it('reports stale front matter', async () => {
    const stale = text.replace(/primary: '#[0-9a-f]{6}'/, "primary: '#000000'");
    expect((await check(stale)).join('\n')).toMatch(/front matter is stale/);
  });
});
