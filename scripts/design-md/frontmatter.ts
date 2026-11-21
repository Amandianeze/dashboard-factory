/**
 * DESIGN.md front matter generated from the DTCG tokens (light theme, comfortable density; the
 * format has no modes, so other themes are described in the prose and live in tokens/).
 *
 * Each DESIGN.md name maps to exactly one token path. Component properties are written as
 * references into the front matter, found by following the component token's reference chain
 * until it reaches a mapped token, so the two can't drift apart.
 */
import { resolveSet, type ResolvedSet, type Token, type Typography } from '../tokens/lib';

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const DIV = ['-4', '-3', '-2', '-1', '0', '+1', '+2', '+3', '+4'];
const divName = (k: string) => k.replace(/^-/, 'm').replace(/^\+/, 'p');

/**
 * DESIGN.md colour name → semantic token path. Order = order in the file.
 * Left out on purpose: color.bg.surface-raised and color.status.{warning,success,info}. They exist
 * in tokens/ but no component uses them yet; they join when a catalog component does.
 */
export const COLORS: [string, string][] = [
  ['primary', 'color.bg.accent'],
  ['primary-hover', 'color.bg.accent-hover'],
  ['on-primary', 'color.text.on-accent'],
  ['neutral', 'color.bg.canvas'],
  ['surface', 'color.bg.surface'],
  ['surface-pressed', 'color.bg.pressed'],
  ['on-surface', 'color.text.primary'],
  ['on-surface-muted', 'color.text.muted'],
  ['outline', 'color.border.subtle'],
  ['outline-control', 'color.border.control'],
  ['focus-ring', 'color.focus.ring'],
  ['error', 'color.status.danger'],
  ['error-text', 'color.text.danger'],
  ...range(10).map((i): [string, string] => [
    `data-categorical-${i}`,
    `color.data.categorical.${i}`,
  ]),
  ...range(9).map((i): [string, string] => [
    `data-sequential-blue-${i}`,
    `color.data.sequential.blue.${i}`,
  ]),
  ...DIV.map((k): [string, string] => [
    `data-diverging-blue-orange-${divName(k)}`,
    `color.data.diverging.blue-orange.${k}`,
  ]),
  ['data-positive', 'color.data.positive'],
  ['data-negative', 'color.data.negative'],
  ['data-neutral', 'color.data.neutral'],
  ['data-highlight', 'color.data.highlight'],
  ['data-gridline', 'color.data.gridline'],
  ['data-axis', 'color.data.axis'],
  ['data-reference-line', 'color.data.reference-line'],
];

export const TYPOGRAPHY = [
  'display',
  'title',
  'heading',
  'body-large',
  'body-strong',
  'body',
  'caption',
  'label',
] as const;

export const ROUNDED: [string, string][] = [
  ['mark', 'radius.mark'],
  ['panel', 'radius.panel'],
  ['pill', 'radius.pill'],
];

export const SPACING: [string, string][] = [
  ['stack-2xs', 'space.stack.2xs'],
  ['stack-xs', 'space.stack.xs'],
  ['stack-sm', 'space.stack.sm'],
  ['stack-md', 'space.stack.md'],
  ['stack-lg', 'space.stack.lg'],
  ['stack-xl', 'space.stack.xl'],
  ['inline-xs', 'space.inline.xs'],
  ['inline-sm', 'space.inline.sm'],
  ['inset-panel', 'space.inset.panel'],
  ['inset-page', 'space.inset.page'],
  ['inset-control-x', 'space.inset.control-x'],
  ['inset-control-y', 'space.inset.control-y'],
  ['grid-gap', 'space.grid.gap'],
  ['grid-columns', 'layout.grid.columns'],
  ['container-max', 'layout.container.max'],
  ['card-min-width', 'layout.card.min-width'],
  ['breakpoint-stack', 'layout.breakpoint.stack'],
];

type Prop =
  'backgroundColor' | 'textColor' | 'typography' | 'rounded' | 'padding' | 'height' | 'width';
type Component = [string, Partial<Record<Prop, string>>];
/** DESIGN.md component → property → component token path. Variants are separate keys. */
export const COMPONENTS: Component[] = [
  ['page', { backgroundColor: 'page.bg', textColor: 'page.title.color' }],
  [
    'page-title',
    {
      backgroundColor: 'page.bg',
      textColor: 'page.title.color',
      typography: 'page.title.typography',
    },
  ],
  [
    'page-description',
    {
      backgroundColor: 'page.bg',
      textColor: 'page.description.color',
      typography: 'page.description.typography',
    },
  ],
  ['panel', { backgroundColor: 'panel.bg', rounded: 'panel.radius', padding: 'panel.padding' }],
  [
    'panel-title',
    {
      backgroundColor: 'panel.bg',
      textColor: 'panel.title.color',
      typography: 'panel.title.typography',
    },
  ],
  [
    'panel-status',
    {
      backgroundColor: 'panel.bg',
      textColor: 'panel.status.text',
      typography: 'panel.status.typography',
    },
  ],
  [
    'panel-status-error',
    {
      backgroundColor: 'panel.bg',
      textColor: 'panel.status.error',
      typography: 'panel.status.typography',
    },
  ],
  [
    'kpi-value',
    {
      backgroundColor: 'panel.bg',
      textColor: 'kpi.value.text',
      typography: 'kpi.value.typography',
    },
  ],
  [
    'kpi-delta-positive',
    {
      backgroundColor: 'panel.bg',
      textColor: 'kpi.delta.positive.text',
      typography: 'panel.title.typography',
    },
  ],
  [
    'kpi-delta-negative',
    {
      backgroundColor: 'panel.bg',
      textColor: 'kpi.delta.negative.text',
      typography: 'panel.title.typography',
    },
  ],
  [
    'chip',
    {
      backgroundColor: 'chip.bg',
      textColor: 'chip.text',
      typography: 'chip.typography',
      rounded: 'chip.radius',
      padding: 'chip.padding.x',
    },
  ],
  ['chip-hover', { backgroundColor: 'chip.hover.bg', textColor: 'chip.hover.text' }],
  ['chip-pressed', { backgroundColor: 'chip.pressed.bg', textColor: 'chip.pressed.text' }],
  ['chip-selected', { backgroundColor: 'chip.selected.bg', textColor: 'chip.selected.text' }],
  [
    'chip-selected-hover',
    { backgroundColor: 'chip.selected.hover.bg', textColor: 'chip.selected.hover.text' },
  ],
  ['chip-disabled', { backgroundColor: 'chip.disabled.bg', textColor: 'chip.disabled.text' }],
  [
    'chart-label',
    {
      backgroundColor: 'panel.bg',
      textColor: 'chart.label.text',
      typography: 'chart.label.typography',
    },
  ],
  [
    'chart-value-label',
    {
      backgroundColor: 'panel.bg',
      textColor: 'chart.label.text-strong',
      typography: 'chart.label.typography',
    },
  ],
  ['chart-bar', { backgroundColor: 'color.data.categorical.1', rounded: 'chart.mark.bar-radius' }],
  // The format has no border property, so strokes are thin components (width or height).
  ['panel-outline', { backgroundColor: 'panel.border.color', height: 'panel.border.width' }],
  ['chip-outline', { backgroundColor: 'chip.border', height: 'panel.border.width' }],
  ['focus-ring', { backgroundColor: 'chip.focus.ring', width: 'chip.focus.width' }],
  ['chart-gridline', { backgroundColor: 'chart.grid', height: 'panel.border.width' }],
  ['chart-axis', { backgroundColor: 'chart.axis.domain', height: 'panel.border.width' }],
  ['chart-reference-line', { backgroundColor: 'chart.baseline', height: 'panel.border.width' }],
  // Data marks: what chart organisms fill with, per role.
  ...range(10).map((i): Component => [
    `chart-series-${i}`,
    { backgroundColor: `color.data.categorical.${i}` },
  ]),
  ...range(9).map((i): Component => [
    `chart-sequential-blue-${i}`,
    { backgroundColor: `color.data.sequential.blue.${i}` },
  ]),
  ...DIV.map((k): Component => [
    `chart-diverging-blue-orange-${divName(k)}`,
    { backgroundColor: `color.data.diverging.blue-orange.${k}` },
  ]),
  ['chart-positive', { backgroundColor: 'color.data.positive' }],
  ['chart-negative', { backgroundColor: 'color.data.negative' }],
  ['chart-neutral', { backgroundColor: 'color.data.neutral' }],
  ['chart-highlight', { backgroundColor: 'color.data.highlight' }],
];

const px = (n: number) => `${n}px`;

export interface FrontMatter {
  version: 'alpha';
  name: string;
  description: string;
  colors: Record<string, string>;
  typography: Record<string, Record<string, string | number>>;
  rounded: Record<string, string>;
  spacing: Record<string, string | number>;
  components: Record<string, Record<string, string>>;
}

export function buildFrontMatter(
  set: ResolvedSet = resolveSet('light', 'comfortable'),
): FrontMatter {
  const tok = (p: string): Token => {
    const t = set.tokens.get(p);
    if (!t) throw new Error(`DESIGN.md: unknown token ${p}`);
    return t;
  };
  const value = (p: string) => tok(p).resolved;

  const colors = Object.fromEntries(COLORS.map(([name, p]) => [name, String(value(p))]));
  const typography = Object.fromEntries(
    TYPOGRAPHY.map((k) => {
      const t = value(`typography.${k}`) as Typography;
      return [
        k,
        {
          fontFamily: t.fontFamily.split(',')[0]!.replace(/"/g, '').trim(),
          fontSize: px(t.fontSize),
          fontWeight: t.fontWeight,
          lineHeight: t.lineHeight,
          letterSpacing: px(t.letterSpacing),
          ...(k === 'display' ? { fontFeature: '"tnum"' } : {}),
        },
      ];
    }),
  );
  const rounded = Object.fromEntries(ROUNDED.map(([n, p]) => [n, px(value(p) as number)]));
  const spacing = Object.fromEntries(
    SPACING.map(([n, p]) => [
      n,
      tok(p).type === 'number' ? (value(p) as number) : px(value(p) as number),
    ]),
  );

  // Reverse maps: token path → DESIGN.md reference.
  const refOf = new Map<string, string>([
    ...COLORS.map(([n, p]): [string, string] => [p, `{colors.${n}}`]),
    ...TYPOGRAPHY.map((k): [string, string] => [`typography.${k}`, `{typography.${k}}`]),
    ...ROUNDED.map(([n, p]): [string, string] => [p, `{rounded.${n}}`]),
    ...SPACING.map(([n, p]): [string, string] => [p, `{spacing.${n}}`]),
  ]);
  /**
   * Follow a token's references until one is mapped into the front matter. Dimensions with no
   * front-matter scale (stroke widths) are written as literal px values.
   */
  const reference = (path: string): string => {
    if (tok(path).type === 'dimension' && !chainHits(path)) return px(value(path) as number);
    const seen: string[] = [];
    let p: string | undefined = path;
    while (p) {
      const hit = refOf.get(p);
      if (hit) return hit;
      seen.push(p);
      p = tok(p).refs.length === 1 ? tok(p).refs[0] : undefined;
    }
    throw new Error(
      `DESIGN.md: ${path} (via ${seen.join(' → ')}) reaches no front-matter token; map it in scripts/design-md/frontmatter.ts`,
    );
  };
  function chainHits(path: string): boolean {
    for (
      let p: string | undefined = path;
      p;
      p = tok(p).refs.length === 1 ? tok(p).refs[0] : undefined
    )
      if (refOf.has(p)) return true;
    return false;
  }
  const components = Object.fromEntries(
    COMPONENTS.map(([name, props]) => [
      name,
      Object.fromEntries(Object.entries(props).map(([prop, path]) => [prop, reference(path)])),
    ]),
  );

  return {
    version: 'alpha',
    name: 'Factory DS',
    description:
      'Data-first design system for spec-driven analytics dashboards and product UI. Values are placeholders until the rebrand; the token source is tokens/ (DTCG).',
    colors,
    typography,
    rounded,
    spacing,
    components,
  };
}
