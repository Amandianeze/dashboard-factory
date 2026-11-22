/**
 * Registry build (ADR-004): catalog items → registry/registry.json → `shadcn build` → public/r/.
 *
 *   npm run registry:build            # write registry.json and build public/r with shadcn
 *   npm run registry:build -- --check # fail if registry.json is stale (verify; no shadcn run)
 *
 * Every built catalog item becomes `@factory/<id>`. Its files are the transitive closure of its
 * entry modules' relative imports, installed under `factory/` with repo paths preserved, so the
 * relative imports keep resolving in the consuming app without rewriting. Bare imports become
 * npm dependencies at the versions pinned in package.json. Every item depends on @factory/theme
 * (token CSS, Tailwind utilities, base styles).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { loadItems } from '../catalog/build';
import type { CatalogItem } from '../catalog/schema';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
export const REGISTRY_JSON = 'registry/registry.json';
const PREFIX = 'factory';
const SHADCN = '4.23.0';

/** Entry modules per item when its `source` is not the module to ship (engine-drawn chrome). */
const ENTRY_OVERRIDES: Record<string, string[]> = {
  legend: ['src/theme/generated/engines.ts'],
  axis: ['src/theme/generated/engines.ts'],
};

/** Ambient declarations a package needs (not imported, so the closure can't find them). */
const AMBIENT: Record<string, string[]> = {
  'plotly.js-basic-dist-min': ['src/types/plotly-basic.d.ts'],
};

/** CSS shipped by @factory/theme; consumers import these once. */
const THEME_FILES = ['src/theme/generated/tokens.css', 'src/theme/tailwind.css', 'src/styles.css'];

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

const IMPORT =
  /(?:import|export)\s+(type\s+)?[^'"]*?from\s*['"]([^'"]+)['"]|(typeof\s+)?import\(\s*['"]([^'"]+)['"]\s*\)/g;

/** Module specifiers a file imports; `typeOnly` for `import type` and `typeof import()`. */
export function importsOf(text: string): { spec: string; typeOnly: boolean }[] {
  return [...text.matchAll(IMPORT)].map((m) => ({
    spec: (m[2] ?? m[4])!,
    typeOnly: Boolean(m[1] ?? m[3]),
  }));
}

function resolveLocal(from: string, spec: string): string {
  const base = normalize(join(dirname(from), spec));
  for (const c of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')])
    if (existsSync(join(ROOT, c)) && /\.(ts|tsx|css)$/.test(c)) return c;
  throw new Error(`${from}: cannot resolve "${spec}"`);
}

/** npm package name of a bare specifier: "d3", "@base-ui/react/button" → "@base-ui/react". */
const packageOf = (spec: string) =>
  spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]!;

/** Transitive local files and npm packages reachable from `entries`. */
export function closure(entries: string[]): {
  files: string[];
  packages: string[];
  typePackages: string[];
} {
  const files = new Set<string>();
  const packages = new Set<string>();
  const typePackages = new Set<string>();
  const stack = [...entries];
  while (stack.length) {
    const f = stack.pop()!;
    if (files.has(f)) continue;
    files.add(f);
    if (!/\.(ts|tsx)$/.test(f)) continue;
    for (const { spec, typeOnly } of importsOf(readFileSync(join(ROOT, f), 'utf8'))) {
      // Local type imports still ship (the file must exist); npm type imports are not runtime deps.
      if (spec.startsWith('.')) stack.push(resolveLocal(f, spec));
      else if (spec.startsWith('node:')) continue;
      else (typeOnly ? typePackages : packages).add(packageOf(spec));
    }
  }
  for (const p of packages) for (const d of AMBIENT[p] ?? []) files.add(d);
  return {
    files: [...files].sort(),
    packages: [...packages].sort(),
    typePackages: [...typePackages].filter((p) => !packages.has(p)).sort(),
  };
}

const versionOf = (name: string) => {
  const v = pkg.dependencies[name] ?? pkg.devDependencies[name];
  if (!v) throw new Error(`"${name}" is imported but not in package.json`);
  return `${name}@${v.replace(/^[\^~]/, '')}`;
};

/** `@types/<pkg>` for runtime packages that ship no types (e.g. d3), at our pinned versions. */
const typesFor = (packages: string[]) =>
  packages
    .map((p) => `@types/${p.replace(/^@/, '').replace('/', '__')}`)
    .filter((t) => t in pkg.devDependencies && t !== '@types/react')
    .map(versionOf);

const entriesFor = (item: CatalogItem) =>
  ENTRY_OVERRIDES[item.id] ?? [
    ...item.source.filter((s) => s.startsWith('src/') && /\.(ts|tsx)$/.test(s)),
    ...(item.props ? [`docs/lld/${item.props.slice(2)}`] : []),
  ];

const fileEntry = (path: string) => ({
  path,
  type: 'registry:file',
  target: `~/${PREFIX}/${path}`,
});

export function buildRegistry(items: CatalogItem[]) {
  const built = items.filter((i) => i.status === 'beta' || i.status === 'stable');
  return {
    $schema: 'https://ui.shadcn.com/schema/registry.json',
    name: 'factory',
    homepage: 'https://github.com/Amandianeze/dashboard-factory',
    items: [
      {
        name: 'theme',
        type: 'registry:theme',
        title: 'Factory DS theme',
        description:
          'Token CSS variables (light, dark, high contrast; comfortable, compact), Tailwind v4 utilities without the default theme, and base styles. Import the three files once.',
        dependencies: ['tailwindcss', '@tailwindcss/vite'].map(versionOf),
        files: THEME_FILES.map(fileEntry),
      },
      ...built.map((item) => {
        const { files, packages, typePackages } = closure(entriesFor(item));
        return {
          name: item.id,
          type:
            item.atomicLevel === 'atom' || item.atomicLevel === 'molecule'
              ? 'registry:ui'
              : 'registry:block',
          title: item.name,
          description: item.summary,
          dependencies: packages.filter((p) => p !== 'react').map(versionOf),
          devDependencies: [
            ...typesFor([...packages, ...typePackages]),
            // Type-only imports of packages that ship their own types (vega-lite's TopLevelSpec).
            ...typePackages
              .filter((p) => p in pkg.dependencies || p in pkg.devDependencies)
              .map(versionOf),
          ].sort(),
          registryDependencies: ['@factory/theme'],
          files: files.map(fileEntry),
          meta: {
            atomicLevel: item.atomicLevel,
            biLevel: item.biLevel,
            status: item.status,
            lld: `docs/lld/${item.id}.md`,
          },
        };
      }),
    ],
  };
}

async function main() {
  const check = process.argv.includes('--check');
  const { items, errors } = loadItems();
  if (errors.length) {
    for (const e of errors) console.error(`✗ ${e}`);
    process.exit(1);
  }
  const registry = buildRegistry(items);
  const path = join(ROOT, REGISTRY_JSON);
  const options = (await resolveConfig(path)) ?? {};
  const text = await format(JSON.stringify(registry), { ...options, filepath: path });
  const current = existsSync(path) ? readFileSync(path, 'utf8') : undefined;
  if (check) {
    if (current !== text) {
      console.error(`✗ registry: ${REGISTRY_JSON} is stale; run \`npm run registry:build\``);
      process.exit(1);
    }
    console.log(`✓ registry: ${registry.items.length} items, registry.json up to date`);
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  if (current !== text) writeFileSync(path, text);
  // shadcn inlines every file's content into public/r/<name>.json (one per item) plus registry.json.
  execFileSync('npx', ['--no-install', 'shadcn', 'build', REGISTRY_JSON, '--output', 'public/r'], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  const out = relative(ROOT, join(ROOT, 'public/r'));
  console.log(
    `✓ registry: ${registry.items.length} items → ${REGISTRY_JSON} → ${out}/ (shadcn ${SHADCN})`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) void main();
