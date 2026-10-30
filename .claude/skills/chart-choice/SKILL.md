---
name: chart-choice
description: Rubric for choosing a renderer and chart type from the question a panel answers, plus label, format, color and layout rules. Shared by spec-author (before writing a panel) and design-reviewer (after). Use when deciding what a panel should be.
---

# Choosing the chart

Start from the question, not the chart. Write the question in the panel `title` ("Weekly revenue
by region", not "Revenue chart"), then pick.

## Question → form

| The question is…                          | Use                                             | Renderer                                 |
| ----------------------------------------- | ----------------------------------------------- | ---------------------------------------- |
| One headline number                       | KPI card                                        | `kpi`                                    |
| How does it change over time?             | Line (area only for a single cumulative series) | `vega-lite`                              |
| Which is biggest / smallest? (top-N)      | Sorted horizontal bars                          | VL or `d3` RankedBars                    |
| How do parts make up a whole (≤ 5 parts)? | Stacked bar (100% if only shares matter)        | `vega-lite`                              |
| How do two measures relate?               | Scatter                                         | VL; `plotly` only if dense + zoom needed |
| Two categories × one measure              | Heatmap (`rect`)                                | `vega-lite`                              |
| Compare many small groups                 | Facets / small multiples                        | `vega-lite`                              |
| Something Vega-Lite genuinely cannot draw | A catalog D3 chart                              | `d3`                                     |

Never: pie/donut beyond 3 slices, 3D, dual y-axes, unsorted categorical bars (unless ordinal),
truncated bar baselines.

## Encoding rules

- Bars start at 0; lines may not.
- ≤ 8 colored series. If there are more, aggregate the tail into "Other" or facet.
- The same category gets the same color in every panel of a dashboard.
- Color encodes only what a legend or label can explain; never the only carrier of meaning where
  it matters (add labels or a second channel).
- Time axes use UTC units (`utcyearweek`, …) and whole periods; flag partial periods in the title
  or exclude them.

## Text and formats

- Titles state what and how it is cut. Axis titles only when units are not obvious; `title: null`
  on self-explanatory axes.
- Formats: currency `'$,.0f'` or `'$~s'` for axes; counts `',.0f'`; shares `'.1%'`. Quote them.
- Every chart gets tooltips with formatted numbers. D3 charts need `role="img"` and an `aria-label`.

## Layout

- KPIs first (row height ≈ 132), then the primary trend (span 8+, height ≈ 340), then supporting
  panels. Spans per row total ≤ 12.
- At most 3 KPIs per row at span 4; more than ~8 panels means two dashboards.
- If a filter applies, list **every** panel it affects in `appliesTo`.

## Review use

`design-reviewer` should flag violations of the above with panel id, evidence and the change to
make. `spec-author` should check each panel against the table before running validation.
