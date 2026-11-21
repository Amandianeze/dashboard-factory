/**
 * Catalog item front matter (docs/lld/<id>.md). This is the contract that catalog.json and the
 * dashboard `kind` enum are generated from, and that `npm run lld:check` validates.
 *
 * Taxonomy fields (Phase 3) are always required. The LLD fields (Phase 4) are required on every
 * item that needs a full LLD: built items and P1/P2 gaps (Gate 3, decision 1). P3 gaps stay stubs.
 * Cross-file checks (tokens exist, files exist, ADRs exist) live in build.ts.
 */
import { z } from 'zod';

export const ITEM_ID = /^[a-z][a-z0-9-]*$/;
const ItemId = z.string().regex(ITEM_ID, 'catalog ids are kebab-case: a-z, 0-9 and -');

/** UI ladder (Brad Frost, Atomic Design). Pages are dashboard specs, not catalog items. */
export const ATOMIC_LEVELS = ['atom', 'molecule', 'organism', 'template'] as const;
/** BI ladder (SQLBI). Report templates (multi-page apps) have no items yet. */
export const BI_LEVELS = [
  'object',
  'pattern',
  'visual',
  'page-template',
  'report-template',
] as const;
/** Lifecycle and meaning: ADR-005. */
export const STATUSES = ['proposed', 'beta', 'stable', 'deprecated'] as const;
export const RENDER_ENGINES = ['react', 'flint', 'vega-lite', 'd3', 'plotly'] as const;
export const GAP_PRIORITIES = ['P1', 'P2', 'P3'] as const;
/** Package boundaries (ADR-004): where an item ships when the packages split. */
export const PACKAGES = ['@factory/ui', '@factory/panels', '@factory/format'] as const;
export const TEST_KINDS = ['unit', 'interaction', 'a11y', 'visual', 'break-ui'] as const;
/** Token tiers a component may consume (ADR-001, principle 2): never primitives or raw palettes. */
export const CONSUMABLE_TIERS = ['semantic', 'component', 'density', 'motion'] as const;
/** Body sections of a full LLD, in order (docs/lld/_template.md). */
export const LLD_SECTIONS = [
  'Purpose',
  'Anatomy',
  'Props and variants',
  'States',
  'Token map',
  'Data binding and formatting',
  'Responsive and density',
  'Accessibility',
  'Motion',
  'Dependencies and bundle',
  'Test plan',
  'Open questions',
] as const;

const TokenPath = z.string().regex(/^[a-z0-9-]+(\.[a-z0-9+-]+)+$/, 'a dotted token path');
const AdrId = z.string().regex(/^ADR-\d{3}$/, 'ADR-NNN');

export const CatalogItem = z
  .object({
    /* ------------------------------------------------ taxonomy (Phase 3) */
    id: ItemId,
    name: z.string().min(1),
    /** One sentence: what it is. Agents read this from catalog.json before building anything. */
    summary: z.string().min(1),
    atomicLevel: z.enum(ATOMIC_LEVELS),
    biLevel: z.enum(BI_LEVELS).nullable(),
    status: z.enum(STATUSES),
    renderEngine: z.enum(RENDER_ENGINES),
    /** Catalog items this one is built from today (not aspirations; those go in the LLD body). */
    composes: z.array(ItemId).default([]),
    /** Files that implement it today, relative to the repo root. Empty for proposed items. */
    source: z.array(z.string().min(1)).default([]),
    /**
     * Present on organisms a dashboard panel can be: the spec's `kind`. `renderers` lists the
     * panel `renderer` values allowed with that kind. Proposed items may list none yet.
     */
    panel: z
      .object({ renderers: z.array(z.string().min(1)) })
      .strict()
      .optional(),
    /** Required for proposed items: why it is needed and how soon. */
    gap: z
      .object({ priority: z.enum(GAP_PRIORITIES), reason: z.string().min(1) })
      .strict()
      .optional(),
    /** Required for deprecated items: the catalog id to use instead. */
    replacement: ItemId.optional(),

    /* ----------------------------------------------------- LLD (Phase 4) */
    package: z.enum(PACKAGES).optional(),
    /** Always `@factory/<id>` (ADR-004). */
    registryItem: z.string().optional(),
    /** Code Connect node; null until a Figma file exists (Gate 0, decision 1). */
    figmaNode: z.string().nullable().optional(),
    /** Existing tokens the item consumes (semantic, component, density or motion tier). */
    tokens: z.array(TokenPath).optional(),
    /** Tokens the item needs that don't exist yet; added to tokens/ when it is built. */
    newTokens: z.array(TokenPath).optional(),
    /** `./<id>.props.ts` next to the LLD: the single props interface. null: engine-drawn. */
    props: z.string().nullable().optional(),
    /** `path#Export` of the Zod schema for bound data (repo-relative). null: no bound data. */
    dataContract: z
      .string()
      .regex(/^[^#]+#[A-Za-z_$][\w$]*$/, 'path#ExportName')
      .nullable()
      .optional(),
    a11y: z
      .object({
        role: z.string().min(1),
        keyboard: z.string().min(1),
        srSummary: z.enum(['required', 'optional', 'n/a']),
        minContrast: z.union([z.literal(3), z.literal(4.5), z.literal(7)]),
      })
      .strict()
      .optional(),
    /** null: does not move. Motion is designed in Phase 6 with the motion tokens. */
    motion: z
      .object({ enter: z.string().min(1), reducedMotion: z.string().min(1) })
      .strict()
      .nullable()
      .optional(),
    perfBudget: z
      .object({ renderMs: z.number().positive(), bundleKb: z.number().nonnegative() })
      .strict()
      .optional(),
    tests: z.array(z.enum(TEST_KINDS)).min(1).optional(),
    references: z.array(z.string().url()).min(1).optional(),
    adr: z.array(AdrId).optional(),
  })
  .strict()
  .superRefine((item, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    if (item.status === 'proposed') {
      if (!item.gap) issue('gap', 'proposed items need a gap { priority, reason }');
      if (item.source.length) issue('source', 'proposed items have no implementation yet');
    } else {
      if (item.gap) issue('gap', `only proposed items carry a gap (status is ${item.status})`);
      if (!item.source.length) issue('source', `a ${item.status} item names its source files`);
      if (item.panel && !item.panel.renderers.length)
        issue('panel', 'a built panel organism lists at least one renderer');
    }
    if (item.status === 'deprecated' && !item.replacement)
      issue('replacement', 'deprecated items name a replacement');
    if (item.panel && item.atomicLevel !== 'organism')
      issue('panel', 'only organisms can be a dashboard panel kind');

    const lldFields = [
      'package',
      'registryItem',
      'figmaNode',
      'tokens',
      'props',
      'dataContract',
      'a11y',
      'motion',
      'perfBudget',
      'tests',
      'references',
      'adr',
    ] as const;
    if (needsFullLld(item)) {
      for (const f of lldFields)
        if (item[f] === undefined) issue(f, `required: this item needs a full LLD`);
      if (item.registryItem !== undefined && item.registryItem !== `@factory/${item.id}`)
        issue('registryItem', `must be "@factory/${item.id}"`);
      if (item.props && item.props !== `./${item.id}.props.ts`)
        issue('props', `must be "./${item.id}.props.ts" (or null for engine-drawn items)`);
      if (item.props === null && item.renderEngine === 'react')
        issue('props', 'a React item has a props interface');
    } else {
      for (const f of [...lldFields, 'newTokens'] as const)
        if (item[f] !== undefined) issue(f, 'P3 stubs carry taxonomy fields only (Gate 3)');
    }
  });
export type CatalogItem = z.infer<typeof CatalogItem>;

/** Built items and P1/P2 gaps get a full LLD; P3 gaps stay stubs until needed (Gate 3). */
export const needsFullLld = (i: Pick<CatalogItem, 'status' | 'gap'>) =>
  i.status !== 'proposed' || i.gap?.priority !== 'P3';
