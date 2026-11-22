/**
 * Catalog item front matter (docs/lld/<id>.md). This is the contract that catalog.json and the
 * dashboard `kind` enum are generated from.
 *
 * Phase 3 defines the taxonomy fields only. Phase 4 (LLD system) adds package, registryItem,
 * tokens, props, dataContract, a11y, motion, perfBudget, tests, references and adr.
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
/** proposed: a gap, nothing built · beta: built, no LLD/story yet · stable: full LLD + story. */
export const STATUSES = ['proposed', 'beta', 'stable', 'deprecated'] as const;
export const RENDER_ENGINES = ['react', 'flint', 'vega-lite', 'd3', 'plotly'] as const;
export const GAP_PRIORITIES = ['P1', 'P2', 'P3'] as const;

export const CatalogItem = z
  .object({
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
  });
export type CatalogItem = z.infer<typeof CatalogItem>;
