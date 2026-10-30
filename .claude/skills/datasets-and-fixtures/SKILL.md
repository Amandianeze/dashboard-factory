---
name: datasets-and-fixtures
description: How to add or change a dataset or fixture — deterministic generation, declaring field types, profiling every row, and building in the edge cases (nulls, long labels, negatives). Use when a dashboard needs new data, a new field, or when chart magnitudes look wrong.
---

# Datasets and fixtures

Fixtures in `public/data/*.json` are **generated**; never edit them (a hook blocks it). Change
`scripts/generate-fixtures.ts`, then `npm run data:fixtures`.

## Adding or changing a fixture

1. Edit `scripts/generate-fixtures.ts`. Use the seeded `rng(seed)` already there; never
   `Math.random()` or `new Date()`, or screenshots stop being reproducible.
2. Shape: an array of flat row objects; dates as ISO `YYYY-MM-DD` strings; numbers as JSON
   numbers (not strings). One row = one grain; say which in the dataset `description`
   (e.g. "One row per day × region × product").
3. Cover whole periods. Vega-Lite weeks start on Sunday: start on a Sunday and use a multiple of
   7 days, or the first/last bucket looks like a drop.
4. Write the file with `writeFileSync`, `JSON.stringify` (compact), and log the row count.
5. `npm run data:fixtures`, then declare the dataset in the spec:
   `source: fixture`, `path`, and `fields` with the right `quantitative | temporal | nominal | ordinal`.

## Profile before charting

```
npm run data:profile [-- dashboards/<id>.dashboard.yaml]
```

Checks **every** row (unlike `spec:validate`, which samples row 0): missing keys, values that do
not fit the declared type, nulls, distinct counts, min/max, negatives, longest label, date range,
and row count against the 5,000-row budget. Use it to choose charts (cardinality ≤ 8 for color,
long labels need horizontal bars) and to sanity check magnitudes in titles and formats.

## Edge cases worth generating on purpose

A fixture that is too clean hides renderer bugs. Where the dashboard will meet real data, include:
a category with a long name, a zero-value period, nulls in an optional measure, and (if the metric
can go negative) negative values. Keep them rare and deterministic. Note any such rows in the
dataset `description` so reviewers do not read them as bugs.

## Rules

- Field names in a dataset are the contract; renaming one means updating every panel and filter.
- Any fixture change can change screenshots: follow the `visual-baselines` skill.
- Row budget: > 5,000 rows means pre-aggregate in `src/data/transforms.ts` or generate a rolled-up
  dataset (see `render-performance`).
- `source: api` is Phase 3; do not use it in specs yet.
