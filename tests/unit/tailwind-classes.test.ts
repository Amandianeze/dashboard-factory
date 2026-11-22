/**
 * Tailwind's default theme is not loaded, so scale utilities (`m-0`, `top-0`, `p-3`) compile to
 * nothing, silently. Any string in src/ that full Tailwind would turn into CSS must also produce
 * CSS with our theme-less setup.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { __unstable__loadDesignSystem } from '@tailwindcss/node';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const SRC = join(import.meta.dirname, '../../src');

function classCandidates(): Map<string, string> {
  const found = new Map<string, string>();
  for (const file of readdirSync(SRC, { recursive: true, encoding: 'utf8' })) {
    if (!file.endsWith('.tsx')) continue;
    const text = readFileSync(join(SRC, file), 'utf8');
    const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node)) return;
      // A hyphen, colon or bracket separates utilities from prose such as "block" or "table".
      if (ts.isStringLiteralLike(node))
        for (const word of node.text.split(/\s+/)) if (/[-:[]/.test(word)) found.set(word, file);
      ts.forEachChild(node, visit);
    };
    visit(ast);
  }
  return found;
}

describe('Tailwind classes', () => {
  it('every utility used in src generates CSS without the default theme', async () => {
    const base = join(SRC, 'theme');
    const ours = await __unstable__loadDesignSystem(
      readFileSync(join(base, 'tailwind.css'), 'utf8'),
      { base },
    );
    const full = await __unstable__loadDesignSystem("@import 'tailwindcss';", { base });
    const found = classCandidates();
    const words = [...found.keys()];
    const withOurs = ours.candidatesToCss(words);
    const withFull = full.candidatesToCss(words);
    const dead = words
      .filter((_, i) => withFull[i] && !withOurs[i])
      .map((w) => `${found.get(w)}: ${w}`);
    expect(dead).toEqual([]);
  });
});
