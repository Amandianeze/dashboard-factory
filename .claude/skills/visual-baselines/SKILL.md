---
name: visual-baselines
description: How to run, read and update the Playwright screenshot baselines safely. Covers the Linux-only baselines (produced in Docker on macOS), reading actual/diff images, and updating only one dashboard. Use whenever test:e2e fails on a screenshot or after an intended visual change.
---

# Visual baselines

Baselines live in `tests/e2e/dashboards.spec.ts-snapshots/` as `<dashboard>--<panel>-chromium-linux.png`
plus one full-page `<dashboard>-chromium-linux.png`. They are **Linux** renders. A macOS run looks for
`-darwin` files that do not exist and fails, and font rendering differs anyway, so produce and
compare baselines in the Playwright Docker image, never from the host. Baselines are write-protected
from Edit/Write; the only legitimate way to change them is the Playwright command below.

## Run e2e in Docker (matches the baselines)

The image tag must match `@playwright/test` (`npx playwright --version`, currently 1.64.1). Use a
named volume for `node_modules` so Linux binaries never overwrite your host install:

```
docker run --rm --ipc=host -v "$PWD":/work -v dashboard-factory-node-modules:/work/node_modules \
  -w /work mcr.microsoft.com/playwright:v1.64.1-noble \
  bash -c "apt-get update -qq && apt-get install -y -qq --no-install-recommends fonts-inter && npm ci && npx playwright test"
```

The image has no Inter, and without it Chromium falls back to a single-weight font: every text
pixel changes and semibold titles render regular. Always install `fonts-inter` first, as CI does
(`.github/workflows/ci.yml`). Add `-g <dashboard-id>` to run one dashboard (test titles are
`<id> renders every panel`).

The gate is exact (`maxDiffPixels: 0`, per-pixel `threshold: 0.05` in `playwright.config.ts`):
rendering in the pinned container is deterministic, so any failing pixel is a real change.

## When a screenshot test fails

1. Open `test-results/<test>/…-actual.png`, `…-expected.png` and `…-diff.png` (Read them).
2. Decide with evidence: does the diff match the change you were asked to make?
   - Intended (new panel, moved legend you changed on purpose): update that dashboard only.
   - Unintended (collapsed chart, shifted legend, different numbers): it is a regression. Fix the
     cause. Do not update.
   - Tiny anti-aliasing noise on a change you did not touch: re-run once in Docker before judging.
     Do not add `maxDiffPixels`, `maxDiffPixelRatio` or a higher `threshold` to hide it.
3. For a data-driven diff, confirm fixtures did not change (`git status public/`).

## Update only what you changed

```
docker run … bash -c "apt-get update -qq && apt-get install -y -qq --no-install-recommends fonts-inter && npm ci \
  && npx playwright test -g <dashboard-id> --update-snapshots"
```

Never `--update-snapshots` across all dashboards to turn a red run green. After updating, `git status`
must show only that dashboard's PNGs changed; Read each new panel PNG and confirm it looks right.
New dashboard: the same command creates its baselines (first run writes them).

## Checklist before reporting done

- [ ] Ran in Docker (Linux) with `fonts-inter` installed, not on the host
- [ ] Looked at every changed PNG, not just the pass/fail
- [ ] Only the intended dashboard's baselines changed
- [ ] No tolerance or test edits made to get green
