---
name: debug-panel
description: Triage for a dashboard panel that renders blank, collapsed, clipped, shows NaN or an error box, or looks wrong. Renders one panel in a real browser and maps the symptom to a cause. Use before editing a spec "to see if it helps".
---

# Debug a panel

Look first, then change one thing. Do not edit the spec at random until validation passes.

## 1. Reproduce one panel

```
npm run panel:render -- <dashboard-id> <panel-id> [--filter <filter-id>=<value>,<value>]
```

Prints the panel/body/svg boxes, any `role="alert"` text and console errors, and writes to
`test-results/render-panel/`: `<id>--<panel>.png` (Read it to see the panel) and, for Vega-Lite,
`<id>--<panel>.vega.json` (the compiled Vega spec). Exit code 1 when there are alerts or errors.
`--filter` clicks the chip for each value, to reproduce filter-dependent bugs.

Also run `npm run spec:validate -- dashboards/<id>.dashboard.yaml` and `npm run data:profile`.

## 2. Symptom → cause

| Symptom                                       | Likely cause                                                                          | Fix                                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Panel box fine, svg height 0 or tiny          | Row `height` too small for title + chart, or `autosize` / `width`/`height` overridden | Raise `layout.rows[].height`; remove `width`/`height`/`autosize` from the panel spec     |
| Alert "Panel failed to render: …"             | Error thrown in the renderer; text is the real message                                | Read the message; for VL, search it in the compiled `.vega.json`                         |
| Alert mentioning a field / `Infinite extent`  | Field not in the data, or all values null/strings                                     | `npm run data:profile`; fix `fields` type or the fixture                                 |
| KPI shows `—`                                 | `aggregate` returned NaN: no rows (filter excludes everything) or non-numeric values  | Check `--filter`; profile the field                                                      |
| Buckets look shifted by a day, odd first/last | Local `timeUnit` on UTC date strings, or partial weeks                                | Use `utc*` units; make fixture cover whole Sunday-start weeks                            |
| Legend/axis title overlaps the plot (Plotly)  | Spec `layout` override replaced themed axes (shallow merge)                           | Override only leaf keys you must; remember `xaxis: {…}` replaces the whole themed object |
| Bars/labels collide (D3 RankedBars)           | Long category names vs fixed `LABEL_W`; negative values                               | Shorten labels or fix the component; add a test for the case                             |
| Chart blank only after a filter change        | Panel got zero rows, or the error boundary kept an old error                          | Reload; if it recovers, the boundary is not resetting (a runtime bug, not a spec bug)    |
| Works in dev, blank in `test:e2e`             | Screenshot taken before draw, or console error                                        | Run `panel:render` (it waits for the drawn element); read the console output             |
| Colors look wrong / default Vega palette      | Inline `scale.range` or `config` override beating the theme                           | Remove the override; colors come from `src/theme/`                                       |

## 3. Close out

- Fix the cause (spec, fixture, or renderer code). Never loosen the schema or a test.
- Re-run `npm run panel:render` and Read the new screenshot; do not assume it is fixed.
- Then `npm run verify`. If a baseline legitimately changes, see the `visual-baselines` skill.
