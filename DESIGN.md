---
# Generated from tokens/ by `npm run design:build`. Edit tokens/, not this block; the prose below is hand-written.
version: alpha
name: Factory DS
description: Data-first design system for spec-driven analytics dashboards and product UI. Values are placeholders until the rebrand; the token source is tokens/ (DTCG).
colors:
  primary: '#2f5bea'
  primary-hover: '#1f3ea6'
  on-primary: '#ffffff'
  neutral: '#f7f7f5'
  surface: '#ffffff'
  surface-pressed: '#e4e4e0'
  on-surface: '#1d1d1b'
  on-surface-muted: '#6b6b66'
  outline: '#e4e4e0'
  outline-control: '#8b8b85'
  focus-ring: '#2f5bea'
  error: '#b42318'
  error-text: '#b42318'
  data-categorical-1: '#2f5bea'
  data-categorical-2: '#e3742f'
  data-categorical-3: '#1f9d74'
  data-categorical-4: '#b4458f'
  data-categorical-5: '#8e2e05'
  data-categorical-6: '#883a4b'
  data-categorical-7: '#279bd9'
  data-categorical-8: '#ff587b'
  data-categorical-9: '#4d773e'
  data-categorical-10: '#15a0af'
  data-sequential-blue-1: '#e4ebfb'
  data-sequential-blue-2: '#cccffe'
  data-sequential-blue-3: '#b1b4ff'
  data-sequential-blue-4: '#959afe'
  data-sequential-blue-5: '#7380ff'
  data-sequential-blue-6: '#546aec'
  data-sequential-blue-7: '#4355c3'
  data-sequential-blue-8: '#34419d'
  data-sequential-blue-9: '#242e78'
  data-diverging-blue-orange-m4: '#353c87'
  data-diverging-blue-orange-m3: '#5063df'
  data-diverging-blue-orange-m2: '#8994ff'
  data-diverging-blue-orange-m1: '#bfccf0'
  data-diverging-blue-orange-0: '#ecebe7'
  data-diverging-blue-orange-p1: '#eac3b4'
  data-diverging-blue-orange-p2: '#e47e5a'
  data-diverging-blue-orange-p3: '#b84724'
  data-diverging-blue-orange-p4: '#762710'
  data-positive: '#056306'
  data-negative: '#ce2e75'
  data-neutral: '#8b8b85'
  data-highlight: '#2f5bea'
  data-gridline: '#ececea'
  data-axis: '#e4e4e0'
  data-reference-line: '#6b6b66'
typography:
  display:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.32px
    fontFeature: '"tnum"'
  title:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: 0px
  heading:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0px
  body-large:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: 0px
  body-strong:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0px
  body:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0px
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: 0px
  label:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: 0px
rounded:
  mark: 2px
  panel: 10px
  pill: 999px
spacing:
  stack-2xs: 4px
  stack-xs: 6px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
  stack-xl: 48px
  inline-xs: 4px
  inline-sm: 6px
  inset-panel: 16px
  inset-page: 16px
  inset-control-x: 12px
  inset-control-y: 4px
  grid-gap: 16px
  grid-columns: 12
  container-max: 1440px
  card-min-width: 280px
  breakpoint-stack: 760px
components:
  page:
    backgroundColor: '{colors.neutral}'
    textColor: '{colors.on-surface}'
  page-title:
    backgroundColor: '{colors.neutral}'
    textColor: '{colors.on-surface}'
    typography: '{typography.title}'
  page-description:
    backgroundColor: '{colors.neutral}'
    textColor: '{colors.on-surface-muted}'
    typography: '{typography.body-large}'
  panel:
    backgroundColor: '{colors.surface}'
    rounded: '{rounded.panel}'
    padding: '{spacing.inset-panel}'
  panel-title:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.on-surface-muted}'
    typography: '{typography.body-strong}'
  panel-status:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.on-surface-muted}'
    typography: '{typography.body}'
  panel-status-error:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.error-text}'
    typography: '{typography.body}'
  kpi-value:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.on-surface}'
    typography: '{typography.display}'
  kpi-delta-positive:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.data-positive}'
    typography: '{typography.body-strong}'
  kpi-delta-negative:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.data-negative}'
    typography: '{typography.body-strong}'
  chip:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.on-surface}'
    typography: '{typography.body}'
    rounded: '{rounded.pill}'
    padding: '{spacing.inset-control-x}'
  chip-hover:
    backgroundColor: '{colors.neutral}'
    textColor: '{colors.on-surface}'
  chip-pressed:
    backgroundColor: '{colors.surface-pressed}'
    textColor: '{colors.on-surface}'
  chip-selected:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
  chip-selected-hover:
    backgroundColor: '{colors.primary-hover}'
    textColor: '{colors.on-primary}'
  chip-disabled:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.on-surface-muted}'
  chart-label:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.on-surface-muted}'
    typography: '{typography.label}'
  chart-value-label:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.on-surface}'
    typography: '{typography.label}'
  chart-bar:
    backgroundColor: '{colors.data-categorical-1}'
    rounded: '{rounded.mark}'
  panel-outline:
    backgroundColor: '{colors.outline}'
    height: 1px
  chip-outline:
    backgroundColor: '{colors.outline-control}'
    height: 1px
  focus-ring:
    backgroundColor: '{colors.focus-ring}'
    width: 2px
  chart-gridline:
    backgroundColor: '{colors.data-gridline}'
    height: 1px
  chart-axis:
    backgroundColor: '{colors.data-axis}'
    height: 1px
  chart-reference-line:
    backgroundColor: '{colors.data-reference-line}'
    height: 1px
  chart-series-1:
    backgroundColor: '{colors.data-categorical-1}'
  chart-series-2:
    backgroundColor: '{colors.data-categorical-2}'
  chart-series-3:
    backgroundColor: '{colors.data-categorical-3}'
  chart-series-4:
    backgroundColor: '{colors.data-categorical-4}'
  chart-series-5:
    backgroundColor: '{colors.data-categorical-5}'
  chart-series-6:
    backgroundColor: '{colors.data-categorical-6}'
  chart-series-7:
    backgroundColor: '{colors.data-categorical-7}'
  chart-series-8:
    backgroundColor: '{colors.data-categorical-8}'
  chart-series-9:
    backgroundColor: '{colors.data-categorical-9}'
  chart-series-10:
    backgroundColor: '{colors.data-categorical-10}'
  chart-sequential-blue-1:
    backgroundColor: '{colors.data-sequential-blue-1}'
  chart-sequential-blue-2:
    backgroundColor: '{colors.data-sequential-blue-2}'
  chart-sequential-blue-3:
    backgroundColor: '{colors.data-sequential-blue-3}'
  chart-sequential-blue-4:
    backgroundColor: '{colors.data-sequential-blue-4}'
  chart-sequential-blue-5:
    backgroundColor: '{colors.data-sequential-blue-5}'
  chart-sequential-blue-6:
    backgroundColor: '{colors.data-sequential-blue-6}'
  chart-sequential-blue-7:
    backgroundColor: '{colors.data-sequential-blue-7}'
  chart-sequential-blue-8:
    backgroundColor: '{colors.data-sequential-blue-8}'
  chart-sequential-blue-9:
    backgroundColor: '{colors.data-sequential-blue-9}'
  chart-diverging-blue-orange-m4:
    backgroundColor: '{colors.data-diverging-blue-orange-m4}'
  chart-diverging-blue-orange-m3:
    backgroundColor: '{colors.data-diverging-blue-orange-m3}'
  chart-diverging-blue-orange-m2:
    backgroundColor: '{colors.data-diverging-blue-orange-m2}'
  chart-diverging-blue-orange-m1:
    backgroundColor: '{colors.data-diverging-blue-orange-m1}'
  chart-diverging-blue-orange-0:
    backgroundColor: '{colors.data-diverging-blue-orange-0}'
  chart-diverging-blue-orange-p1:
    backgroundColor: '{colors.data-diverging-blue-orange-p1}'
  chart-diverging-blue-orange-p2:
    backgroundColor: '{colors.data-diverging-blue-orange-p2}'
  chart-diverging-blue-orange-p3:
    backgroundColor: '{colors.data-diverging-blue-orange-p3}'
  chart-diverging-blue-orange-p4:
    backgroundColor: '{colors.data-diverging-blue-orange-p4}'
  chart-positive:
    backgroundColor: '{colors.data-positive}'
  chart-negative:
    backgroundColor: '{colors.data-negative}'
  chart-neutral:
    backgroundColor: '{colors.data-neutral}'
  chart-highlight:
    backgroundColor: '{colors.data-highlight}'
---

# Factory DS

The design contract for the Dashboard Factory. The front matter holds the normative values and is
generated from `tokens/`; this prose explains why they exist and how to apply them. When the two
disagree, the front matter wins, and the fix is a token change, not a prose change. All values are
placeholders until the rebrand: their names and roles are stable, but expect the values to change.

## Overview

Factory DS is a **data-first** system for analytics dashboards and the product UI around them
(navigation, filters, settings, CRUD pages). The reader is someone who opens a dashboard to answer a
question in under a minute, so the UI should feel **quiet, precise and trustworthy**: warm neutral
surfaces, one blue accent, and the data doing the talking. Chrome stays low-contrast and flat so
that series colours and numbers carry the visual weight.

Density stance: **comfortable by default, compact on request** (`[data-density='compact']`). Panels
are wide and short, KPIs come first, and every pixel of a chart panel should be plot, not padding.
Personality comes from typographic precision (tabular figures, tight display tracking), not
decoration.

## Colors

The UI palette is warm greys plus a single accent. Data colours live in their own family and are
never reused as UI colours, except `primary`, which is also series 1.

- **primary** (with `primary-hover`, `on-primary`): the only interactive accent: selected chips,
  links, focus rings, highlighted data. Use it for at most one prominent action per view.
- **neutral**: the page canvas, a warm off-white so panels (`surface`) read as raised without shadows.
- **surface / surface-pressed**: panels and controls; `surface-pressed` is the pressed state of a
  control, never a resting background.
- **on-surface / on-surface-muted**: primary text, and secondary text (panel titles, axis labels,
  captions). Both pass 4.5:1 on every surface; in the high-contrast theme they pass 7:1.
- **outline / outline-control**: `outline` separates panels and is decorative; `outline-control` is
  the boundary of an interactive control and keeps 3:1 against the surface.
- **error / error-text**: failures (a panel that couldn't render, invalid data). Never decorative.

Data-viz palettes, and when to use each:

- **Categorical** (`data-categorical-1…10`): unordered groups (regions, products). Series _n_ always
  takes colour _n_, in every panel of a dashboard. The first 8 stay at least ΔE₀₀ 10 apart for
  deuteranopic and protanopic viewers; 9 and 10 are overflow, at ΔE₀₀ 8 or more.
- **Sequential** (`data-sequential-blue-1…9`): one ordered measure (heatmaps, choropleths). Lightness
  steps are even, and in dark mode the ramp is reversed so low values sink into the surface.
- **Diverging** (`data-diverging-blue-orange-m4…p4`): a measure with a meaningful midpoint (change vs
  target, correlation). Blue and orange, not red and green, so colour-blind readers can tell the
  sides apart. The midpoint, `data-diverging-blue-orange-0`, is a neutral grey.
- **Sign** (`data-positive`, `data-negative`): up/down, gain/loss, candles. Negative is a
  magenta-red rather than a pure red so it stays distinct from positive green under colour-vision
  deficiency (accepted at Gate 1). Always pair sign colour with a sign glyph (+/−, ▲/▼).
- **data-neutral, data-highlight, data-gridline, data-axis, data-reference-line**: "Other" and
  missing values; the one emphasised series; and chart structure, from faint to strong.

Dark (`[data-theme='dark']`) and high-contrast (`[data-theme='hc']`) themes redefine every colour
above under the same names; see `tokens/semantic/` and the Foundations page (`#/foundations`).

## Typography

One family, **Inter**, with the fallback stack `Inter, system-ui, -apple-system, "Segoe UI",
sans-serif` (no web font is downloaded; Inter is used where installed). Eight levels, chosen for a
dense data UI:

- **display**: headline figures (KPI values). Semibold, tight tracking, and always **tabular
  numerals** (`fontFeature: "tnum"`) so digits align and don't jitter when values update.
- **title**: the page title; one per page.
- **heading**: section and card headings outside dashboards (index cards, settings groups).
- **body-large**: page-level running text, such as a dashboard description.
- **body-strong / body**: UI text and panel titles (`body-strong`), controls and status text (`body`).
- **caption**: metadata (file names, timestamps).
- **label**: chart text: axis ticks, legends, value labels, tooltips. 11px is the floor; nothing in
  the system is set smaller.

Use weight for hierarchy (400, 500, 600) and never more than three weights in a view. Numbers in
tables and KPIs use tabular figures; numbers in prose don't need to.

## Layout

Dashboards use a **12-column grid** (`grid-columns`, Gate 0 decision) with fixed gutters
(`grid-gap`) between panels, centred at `container-max`. A dashboard spec sets each row's height in
px and each panel's span; spans in a row add up to 12 or fewer. Order: KPIs first (short row, about
132px; row heights are set per dashboard in its spec, not by a token), the primary chart next (span
8 or more), then supporting panels.

On a page: `inset-page` around the content, `grid-gap` between the title band, the filter row and
each row of panels, and `stack-2xs` between a title and its description.

Spacing is a 4px-based scale with named roles: `stack-*` (vertical rhythm), `inline-*` (gaps between
items in a row), `inset-*` (padding inside panels, pages and controls). Compact density tightens
every step without changing the type scale. Below `breakpoint-stack` every panel spans the full row
and rows grow to fit (each panel capped at the stacked minimum height).

## Elevation & Depth

Flat. Depth comes from **tonal layers and hairline outlines, not shadows**: the warm `neutral` canvas
sits under white `surface` panels, and each panel has a 1px `outline`. There are no shadow tokens
yet. When overlays (popovers, menus) arrive they'll get one, using `surface-raised`, which already
exists in `tokens/`. In dark mode the layering inverts: the canvas is darkest and panels are one
step lighter.

## Shapes

Soft but engineered. Panels use `rounded.panel` (10px); interactive controls such as chips and
selects are fully rounded pills (`rounded.pill`); data marks get a barely-there `rounded.mark` (2px)
on the value end of bars only, so the baseline stays square and honest. Don't round anything else
in a chart.

## Components

Every component below is in the front matter, with variants as separate keys. Strokes are written as
thin components (`panel-outline`, `chip-outline`, `focus-ring`, `chart-gridline`, …) because the
format has no border property.

- **page, page-title, page-description**: the canvas and the title band at the top of every page.
- **panel, panel-title, panel-outline**: the container for every dashboard visual: a white surface,
  hairline outline, title in `body-strong` muted, and the visual filling the rest. Panel status
  text (`panel-status`) and failures (`panel-status-error`) render inside the panel, never as
  pop-ups.
- **kpi-value, kpi-delta-positive, kpi-delta-negative**: a single figure in `display`, bottom-aligned
  in its panel. A delta, where shown, uses the sign colours _and_ a +/− sign. A KPI whose value is
  itself a change ("Change vs last week") keeps the `display` size and takes the sign colour
  (`kpi-delta-positive` / `kpi-delta-negative` text colour), formatted with a signed format.
- **chip** with **chip-hover**, **chip-pressed**, **chip-selected**, **chip-selected-hover** and
  **chip-disabled**: filter toggles (`aria-pressed`) and the select control share this pill. Every
  state keeps text contrast at 4.5:1 or more (7:1 in high contrast); `chip-outline` is the control
  boundary and `focus-ring` (2px, offset 2px) shows on keyboard focus only. Padding is
  `inset-control-y` vertically and `inset-control-x` horizontally. A selected chip's border matches
  its fill (`primary`); a disabled chip keeps the `outline` border and a not-allowed cursor.
- **chart-label, chart-value-label**: chart text, muted for axes and legends, primary for values
  printed on marks.
- **chart-bar, chart-series-1…10, chart-sequential-blue-1…9, chart-diverging-blue-orange-m4…p4,
  chart-positive, chart-negative, chart-neutral, chart-highlight**: what data marks are filled with,
  by role.
- **chart-gridline, chart-axis, chart-reference-line**: chart structure, in increasing strength.

## Do's and Don'ts

UI:

- Do use `primary` for the single most important action or selection in a view; everything else is
  neutral.
- Do keep interactive boundaries at 3:1 or more (`outline-control`); `outline` is for decoration only.
- Do show the focus ring on keyboard focus (`:focus-visible`), never on mouse click.
- Don't hard-code a colour, size or font anywhere outside `src/theme/`; if a value is missing, add a
  token (`npm run lint:no-raw-values` enforces this).
- Don't introduce shadows, gradients or a second accent colour without an ADR.
- Don't use more than three font weights in a view.

Charts:

- Do write the panel title as the question it answers ("Weekly revenue by region"), not the chart
  type.
- Do start bars at zero and sort categorical bars by value unless the categories are ordinal.
- Do give the same category the same colour in every panel of a dashboard.
- Do pair colour with a second cue (label, sign, position) wherever meaning depends on it.
- Don't use dual y-axes without an ADR.
- Don't use rainbow or multi-hue sequential scales; use the sequential ramp.
- Don't use pie or donut charts with more than 5 slices; use a sorted bar.
- Don't show more than 8 coloured series; fold the tail into "Other" (`data-neutral`) or facet.
- Don't use 3D, truncated bar baselines, or red/green as the only up/down cue.

## Data Visualization

Renderer choice follows `CLAUDE.md`: KPI → Vega-Lite → Flint → D3 → Plotly. Whatever the renderer,
charts look like one system because every engine config is generated from the same tokens
(`scripts/tokens/engines.ts`).

- **Legends** sit **above the plot, left-aligned, horizontal**, in every engine (unified in Phase 2).
  One exception: a continuous colour key (heatmaps) sits beside the plot, vertical, because the
  heatmap's cells are sized to the panel height. Prefer direct labels (as in ranked bars) when
  there are 4 series or fewer and room to print them.
- **Gridlines** run along the measure axis only, in `data-gridline`; the category axis has none.
- **Axes**: titles only when the unit isn't obvious from the panel title; tick labels in `label`,
  muted. Time axes use whole UTC periods, and partial periods are flagged or excluded.
- **Marks**: lines are 2px; points are 6px across at 70% opacity when they overlap; bars have a 2px
  radius on the value end only.
- **Colour roles**: see Colors. Ordered data never uses the categorical palette, and unordered data
  never uses a ramp. A single series is one colour (`chart-bar`, series 1); the categorical palette
  is for when colour itself encodes a field, so don't colour each bar of a one-series chart.
- **Accessibility**: every chart is one image named by its panel title and described by a
  generated summary, and has a **Table** toggle that shows the plotted values exactly. Tooltips
  are formatted, and colour is never the only carrier of meaning.

## Motion

There's little motion today, and that's deliberate: dashboards update data, and data shouldn't
dance. Tokens exist for the motion that will come (`tokens/motion.tokens.json`): durations
`instant` / `fast` / `base` / `slow`, and easings `out` (enter), `in-out` (moves) and `spring`
(rare). They're provisional until the Phase 6 motion pass.

- Enter animations ease out; nothing animates on keyboard-driven actions.
- Under `prefers-reduced-motion` every duration is 0ms (generated CSS).
- Charts don't animate on filter changes until the motion pass decides they should.

## Content & Formatting

Numbers carry the meaning, so their formats are tokens too (`tokens/format.json`, d3-format and
d3-time-format):

- **Integers** `,.0f` (27,744) · **two decimals** `,.2f` (7,720.39) · **percent** `.1%`.
- **Currency** `$,.0f` for headline figures; `$,.2f` for amounts in tables ($12,480.00); `$~s` on
  axes ($80k).
- **Deltas** are always signed: `+,.2f` (+23.59 / −23.59) and `+.2%` (−3.40%). Use the minus sign
  the formatter produces, never a hyphen; the sign is the non-colour cue, so ▲/▼ is optional.
- **Axes** use `,.12~g`, which groups thousands and never falls back to exponent notation (7,690,
  not 7.69e+3).
- **Dates**: day `Oct 29, 2026`, week `2026 W44` (UTC weeks), month `Oct 2026`, time `9:30 AM`.
- **Units** go in the panel title or axis title ("Change (%)"), not after every number.
- **Missing values** show as an em dash (—), never 0, NaN or blank.
- **Breakpoints**: CSS custom properties can't be used in `@media`, so `breakpoint-stack` is the
  one value written literally in a media query.
- Titles and labels use sentence case.

## Host Theming

The system runs standalone and embedded (Microsoft Fabric / Rayfin, third-party portals). A host
may restyle the **semantic** tier only: canvas, surface, text, outline, primary and focus colours,
through the same names. It may not change data-viz palettes, sign colours or the type scale without
an ADR, so a chart means the same thing in every host.

- Theme selection: `?theme=light|dark|hc` in the URL, else the system preference
  (`prefers-contrast: more` → hc, `prefers-color-scheme: dark` → dark). A visible theme switch waits
  for Storybook's toolbar (Gate 1 decision).
- Density: `?density=compact`.
- Host theme adapters (`useHostTheme()`) arrive with the `theme` pack (Phase 7) and map the host's
  payload onto the semantic tier.
