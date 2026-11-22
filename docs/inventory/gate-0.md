# Gate 0: discovery and interface inventory

**Status:** reviewed 2026-11-21. Decisions are recorded at the end; Phase 1 may start.

## What was produced

| Artifact                                           | How it's made                                                                                                                                | Re-run                                                  |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [`code-inventory.csv`](code-inventory.csv)         | TS compiler API over `src/**/*.ts(x)`, a CSS declaration scan, HTML/SVG and specs                                                            | `npx tsx scripts/inventory/code-inventory.ts --summary` |
| [`design-inventory.csv`](design-inventory.csv)     | `tokens.ts` leaves; Flint preset vs our theme (deep diff); colours in compiled Flint output that no token produced; Plotly defaults; favicon | `npx tsx scripts/inventory/design-inventory.ts`         |
| [`palette-audit.md`](palette-audit.md)             | WCAG contrast; CVD (Machado 2009) + CIEDE2000 separability                                                                                   | `npx tsx scripts/inventory/palette-audit.ts`            |
| [`interface-inventory.md`](interface-inventory.md) | Frost categories, variant counts, duplicates, crops in [`img/`](img/)                                                                        | hand-written from the above                             |
| [`bi-reuse-scan.md`](bi-reuse-scan.md)             | SQLBI ladder, ranked by recurrence                                                                                                           | hand-written from the specs                             |

Phase 1 update: `code-inventory.ts` is now `npm run inventory:code`, and its `--check` mode is
`npm run lint:no-raw-values`. `palette-audit.ts` and `design-inventory.ts` read the pre-Phase-1
`tokens.ts`, so they were retired (superseded by `npm run tokens:validate`). Their outputs here are
the Phase 0 record; regenerate them from commit `812561d` if needed.

## Headline numbers

- **107** design values found: 32 token definitions, 24 token references, **51 raw usages** (38 distinct).
- **0** shadows, **0** durations/easings, **0** icons, **0** tables, **1** theme.
- Flint theme controls **15 / 76** preset values. **61** are inherited from `datawrapper` uncontrolled.
- **11** colours reach the screen from Flint output without a token. Plotly has 4 untokenized defaults.
- Contrast: all text pairs pass AA. The control border fails 3:1 (1.27). Sequential stop 1 is 1.12:1.
- CVD: categorical pairs 1–8 (ΔE₀₀ 5.0 protan / 5.5 deutan), 5–7 (5.6 deutan) and 2–5 (5.2 protan) are near-confusable.

## The repo differs from §2 of the prompt (the repo wins)

| §2 says                                                                                                                                                   | The repo has                                                                                                                                                                                                                                                                                                              | Consequence                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| DTCG tokens in `src/theme/tokens/base.tokens.json`, per-template partials, generated `themes.ts`, `check:generated` with contrast warnings                | One TS const, `src/theme/tokens.ts` (15 leaves, light only), pushed to CSS variables at runtime by `theme/css.ts`. No DTCG, no codegen, no contrast check                                                                                                                                                                 | Phase 1 is a **greenfield** DTCG build, not a restructure                                                                |
| 48-column grid with panel margins                                                                                                                         | **12-column** CSS grid with a 16px `gap`; row heights in px                                                                                                                                                                                                                                                               | Needs a decision (Q2)                                                                                                    |
| Panel `kind`: KPI, table/matrix, note, filter panels                                                                                                      | Discriminator is `renderer` (`kpi`, `vega-lite`, `flint`, `d3`, `plotly`). No table, matrix or note panels. Filters are dashboard-level (`select`, `multiselect`), not panels                                                                                                                                             | Phase 3 adds `kind` (organism) as a new field, separate from `renderer`                                                  |
| `templates/`, Power BI importer, screenshot transcription, licence records                                                                                | None of these exist                                                                                                                                                                                                                                                                                                       | Phase 0 Power BI parsing and Phase 7 `.pbit` import have no input. The importer must be built first, or Phase 7 drops it |
| Agents incl. `template-importer`; skills incl. `design-tokens`, `powerbi-import`, `screenshot-to-template`; commands `/from-template`, `/import-template` | Agents: `spec-author`, `chart-builder`, `design-reviewer`, `verifier`. Skills: `chart-choice`, `d3-react`, `dashboard-spec`, `datasets-and-fixtures`, `debug-panel`, `flint`, `harness-maintenance`, `plotly`, `render-performance`, `vega-lite`, `visual-baselines`. Commands: `/new-dashboard`, `/add-panel`, `/verify` | —                                                                                                                        |
| Packages `@factory/*`, packs with `pack.json` + `SKILL.md`, a `theme` pack, `useHostTheme`                                                                | Single Vite app; no `packages/`, no packs, no host integration                                                                                                                                                                                                                                                            | Phase 7's "update the `theme` pack" means "create it"                                                                    |
| Vega-Lite default; `CHART_DEFAULT: Flint → Vega-Lite`                                                                                                     | `CLAUDE.md` makes VL the default and Flint the choice for forms that are fiddly in VL                                                                                                                                                                                                                                     | The two disagree; ADR-002 decides, and `CLAUDE.md` follows                                                               |
| —                                                                                                                                                         | No Tailwind, shadcn, Radix/Base UI, or Storybook. React 19.3, Vite 8.3, TS 6.0, Vitest 5, Zod 3.25, flint-chart 1.0.1                                                                                                                                                                                                     | Each addition goes through `pick-ui-library` and an ADR                                                                  |
| —                                                                                                                                                         | Linux baselines exist only for `revenue-overview`. Darwin baselines and the whole `sp500-today` dashboard are uncommitted WIP                                                                                                                                                                                             | Left untouched                                                                                                           |

**Proposed prompt update:** replace §2 with this table's right-hand column, and turn the
template-library and pack bullets into "to build" items with their own phase.

**Blocked inputs:** `PRODUCT_NAME`, `DESIGN_SYSTEM_NAME` / npm scope and `BRAND_SOURCES` are
still `{{placeholders}}`. With no Figma file there are no Figma variables to read, so the design
inventory uses the code and engine defaults as the design source.

## Top 20 consolidation candidates

Ranked by reach (instances × renderers affected) and by what blocks later phases.

| #   | Candidate                                          | Evidence                                                                                         | Becomes                                                                                                         |
| --- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| 1   | **One number-format module**                       | revenue formatted 4 ways; Plotly ignores d3-format (`6000`)                                      | `format.*` tokens + `@factory/format`, called by VL, Flint, D3, Plotly and KPI                                  |
| 2   | **Semantic status and sign colours**               | 4 reds, 2 greens, no roles; candle colours are Flint built-ins                                   | `color.status.{danger,warning,success,info}`, `color.data.{positive,negative,neutral}`                          |
| 3   | **Take back the 61 inherited Flint preset values** | diverging palette, baseline `#181818`, value-label ink, point size, legend and axis-title policy | Generated Flint theme that sets every visual key from tokens; `extends` keeps only behaviour                    |
| 4   | **One sequential ramp across engines**             | VL uses 6 stops; Flint re-quantizes in Lab; stop 1 is 1.12:1                                     | `color.data.sequential.<name>.1–9`, explicit quantize count, the same stops emitted to VL `range` and Flint     |
| 5   | **Fix categorical CVD collisions; extend to 10**   | 1–8, 5–7, 2–5 below ΔE₀₀ 6 under CVD                                                             | `color.data.categorical.1–10`, validated by `tokens:validate`                                                   |
| 6   | **Add a diverging palette we own**                 | the only diverging palette is Datawrapper's                                                      | `color.data.diverging.<name>.-4…+4`                                                                             |
| 7   | **One legend policy**                              | 4 legend treatments ([crop](img/legend-variants.png))                                            | `chart.legend.*` component tokens, emitted to VL, Plotly and Flint                                              |
| 8   | **One axis and grid policy**                       | x-grid off/on/preset; axis titles explicit/raw/omitted                                           | `chart.axis.*`, `chart.grid.*`; Plotly titles from field labels, not field names                                |
| 9   | **Type scale**                                     | sizes 11/12/13/15/22/32, 4 untokenized; `13px` ×6 next to an unused token                        | `typography.{display,title,heading,body,label,caption,figure}` composites, with `figure` using tabular numerals |
| 10  | **Spacing scale**                                  | 4/6/8/12/16/24/48 raw; Plotly margins 56/12/44; D3 gutters 96/64/8/6                             | 4px-based `space.*` primitives; `chart.inset.*`, `panel.padding`, `control.padding`                             |
| 11  | **Radius scale**                                   | 2 (defined twice), 10, 999                                                                       | `radius.{mark,panel,control,pill}`                                                                              |
| 12  | **Generated Plotly layout template**               | layout built inline in `plotlyFigure.ts` with raw margins, opacity, marker size                  | `plotly-template.ts` generated from tokens, like `vegaTheme.ts`                                                 |
| 13  | **Ink leaks from Flint** (`#000`, `#181818`)       | heatmap legend title, candle axis                                                                | covered by #3; listed separately because it's visible today                                                     |
| 14  | **KPI card organism**                              | 9 instances, value-only; sign shown as text only                                                 | `kpi-card` with value, delta, delta %, sign colour, target, sparkline and unit slots                            |
| 15  | **"Latest value" aggregate**                       | `aggregate: max` ×5 + `min` on one-row datasets                                                  | `last` / `value` aggregate in the schema (object level)                                                         |
| 16  | **Empty / loading / error states**                 | 3 empty behaviours, text-only loading, raw `#b42318` error                                       | `EmptyState`, `Skeleton`, `ErrorState` used by every renderer                                                   |
| 17  | **Filter controls as molecules**                   | `.chip` ×2 roles, select styled as a pill, raw `#fff`, border 1.27:1                             | `FilterChip`, `Select`, `color.text.on-accent`, `color.border.control` (≥ 3:1), `color.focus.ring`              |
| 18  | **Split `.panel` into Card and ChartPanel**        | index cards reuse the dashboard panel class                                                      | `card` atom, `chart-panel` organism                                                                             |
| 19  | **Theme switching mechanism**                      | inline style on `:root` from JS; one theme                                                       | generated CSS with `:root`, `[data-theme]`, `[data-density]`; light, dark, hc                                   |
| 20  | **Layout tokens and the grid decision**            | 12 columns, `gap`, raw 1440 / 760                                                                | `layout.grid.columns`, `layout.panel.margin`, `layout.container.max`, `breakpoint.*` (after Q2)                 |

Not consolidation, but found along the way: the Flint candlestick leaves about 80px of empty panel
below the plot (`sp500-today/intraday`). Panel descriptions sit behind `title=`, which keyboard
and screen-reader users can't reach.

## Proposed token naming scheme

DTCG JSON (`$value`, `$type`, `$description`); references use `{path}`. Paths are lowercase,
dot-separated, and kebab-case within a segment.

**Tier 1: primitive** (raw values; components must never reference them)

```
color.{hue}.{50…950}            color.blue.600, color.neutral.0 / .1000
dimension.{n}                   4px steps: dimension.1 = 4px … dimension.12 = 48px
font.family.{sans,mono}         font.size.{11,12,13,15,18,22,32}   font.weight.{regular,medium,semibold}
radius.{0,2,4,8,10,full}        duration.{0,100,160,240,400}       easing.{standard,emphasized,linear}
```

**Tier 2: semantic** (the only tier themes and hosts override)

```
color.bg.{canvas,surface,surface-raised,accent,accent-hover,danger-subtle,…}
color.text.{primary,secondary,muted,on-accent,danger,success,link}
color.border.{subtle,control,strong,focus}           color.focus.ring
color.status.{danger,warning,success,info}
color.data.categorical.{1…10}
color.data.sequential.{blue,…}.{1…9}
color.data.diverging.{blue-red,…}.{-4…+4}
color.data.{positive,negative,neutral,highlight,reference-line,gridline,axis}
typography.{display,title,heading,body,label,caption,figure}      (DTCG composite)
space.{inset,stack,inline}.{xs,sm,md,lg,xl}                        (density-moded)
radius.{mark,control,panel,pill}     shadow.{panel,overlay}
motion.duration.{instant,fast,base,slow}  motion.easing.{out,in-out,spring}  motion.distance.{sm,md}
format.number.{integer,decimal-2,percent,delta,delta-percent,currency,currency-compact,compact}
format.date.{day,week,month,time,datetime}
layout.{grid.columns,panel.margin,container.max}  breakpoint.{sm,md,lg}
```

**Tier 3: component**: `{component}.{variant?}.{part}.{property}.{state?}`

```
button.primary.bg.hover   chip.selected.bg   chip.border   kpi.value.typography   kpi.delta.positive.text
panel.title.typography    chart.legend.symbol.size       chart.axis.label.typography   chart.inset.left
```

**Modes:** theme (light, dark, hc) and host overrides apply to tier 2 only. Density
(comfortable, compact) applies to `space.*`, `typography.*` sizes and `chart.inset.*`. Data-viz
palettes change per theme for contrast, but never per host without an ADR.

**Emitted names:**

- CSS: `--color-text-muted`, `--space-inset-md`.
- Tailwind v4 `@theme`: the same variables, since `--color-*`, `--spacing-*` and `--radius-*` are its namespaces.
- shadcn: **aliases** generated from tier 2 (`--background`, `--foreground`, `--primary`, `--muted-foreground`, `--border`, `--ring`, `--chart-1…5`), so copy-in shadcn components work unedited.
- Figma: collections Primitive / Semantic / Component, with modes = theme × density.

## Open questions (need an answer before Phase 1)

1. **Variables.** Product name, design-system name and npm scope, and brand sources. Is there a Figma file? Without one, ADR-001 can only be "code is the source; Figma mirrors it later", and Code Connect is deferred.
2. **Grid.** Migrate the spec layout from 12 to 48 columns with panel margins (as §2 assumes; useful for Power BI fidelity), or keep 12? It changes `schema.ts` and every spec.
3. **Scope.** The plan assumes a template library, a package split and Fabric hosting, none of which exist. Recommendation: do Phases 1–3 as written; build `packages/` only when a second consuming app exists; scope the Power BI importer as its own phase before Phase 7.
4. **Brand.** Keep the current look (Inter, `#2f5bea` accent, warm neutrals) as the v1 brand and fix only what fails validation? Or is a rebrand coming from the brand sources?

## Decisions (2026-11-21)

| #   | Question                | Decision                                                                                                   | Effect on later phases                                                                                                                                                                                                                                                                                        |
| --- | ----------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Names and brand sources | **Placeholders, no Figma.** Product "Dashboard Factory", design system "Factory DS", npm scope `@factory`. | ADR-001: code is the token source; Figma mirrors it later. Figma variables export is still generated; Code Connect is deferred until a Figma file exists. Names are rename-safe placeholders.                                                                                                                 |
| 2   | Grid                    | **Keep 12 columns** with `gap`.                                                                            | No schema or spec migration. Tokens: `layout.grid.columns = 12`, `layout.grid.gap`. Revisit if a Power BI importer needs finer placement.                                                                                                                                                                     |
| 3   | Scope                   | **Slim:** Phases 1–3 first.                                                                                | No `packages/` split until a second app consumes the system. The Power BI importer becomes its own phase before Phase 7.                                                                                                                                                                                      |
| 4   | Brand                   | **Rebrand coming.**                                                                                        | Build the full token structure now with current values as **placeholders**, marked as such in `$description`. Fix only what fails validation. Swapping in the new brand should touch only primitive (and maybe semantic) token values. The generators, validators and component tokens must not need changes. |
