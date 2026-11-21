# ADR-001: Token source of truth and Figma sync direction

- **Status:** Accepted (Phase 1, 2026-11-21)
- **Deciders:** project owner (Gate 0 decisions 1 and 4), design-systems agent
- **References:**
  [DTCG format 2025.10](https://www.designtokens.org/tr/2025.10/format/) ·
  [DTCG color 2025.10](https://www.designtokens.org/tr/2025.10/color/) ·
  [WCAG 2.2 SC 1.4.3, 1.4.6, 1.4.11](https://www.w3.org/TR/WCAG22/) ·
  Machado, Oliveira & Fernandes 2009 (CVD simulation) · Sharma, Wu & Dalal 2005 (CIEDE2000)

## Context

Before Phase 1 the only design source was `src/theme/tokens.ts` (15 values, light only), and 61 of
the 76 values in the Flint preset we extend reached the screen unchecked (Gate 0). A rebrand is
coming (Gate 0, decision 4), and there is no Figma file (decision 1). We need one place where
values live, a way to swap the brand without touching code, and checks that stop a bad palette
from shipping.

## Decision

1. **Code is the source of truth.** Tokens live in `tokens/` as DTCG 2025.10 JSON, in three tiers:
   - **primitive** (`tokens/primitive/`, `tokens/dataviz/`, `tokens/motion.tokens.json`): raw values only;
   - **semantic** (`tokens/semantic/{light,dark,hc,base}.tokens.json`): references only, per theme;
   - **component** (`tokens/component/`): references only.

   Density (`tokens/density/{comfortable,compact}`) is a second mode axis, holding references only.

2. **Figma mirrors code.** `npm run tokens:build` writes `src/theme/generated/figma-variables.json`
   (collections = tiers, modes = theme / density, aliases by path). A sync into Figma Variables
   is deferred until a Figma file exists; it will be one-way, code → Figma. Code Connect is deferred
   with it.
3. **Everything else is generated** by `scripts/tokens/build.ts`:
   - CSS custom properties, with `[data-theme]`, `[data-density]`, `prefers-color-scheme`,
     `prefers-contrast` and `prefers-reduced-motion`, plus shadcn variable aliases;
   - typed `themes.ts`;
   - the Vega-Lite config, the Flint theme and the Plotly theme;
   - the Figma payload and the favicon.

   Generated paths are write-protected by a hook, and `verify` fails if they're stale.

4. **Rebrand = edit primitives.** Semantic, component and density tokens may only reference other
   tokens (validator rule `tier`), so a rebrand changes values in `tokens/primitive/` and
   `tokens/dataviz/` and nothing else. `tests/unit/tokens.test.ts` proves it: one brand primitive
   changes the accent everywhere, and a brand colour that breaks contrast is refused.
5. **Formats are not DTCG.** DTCG 2025.10 requires every token to have one of its types, and none
   of them is a string. So number and date formats live in `tokens/format.json`, checked by Zod
   and by d3-format / d3-time-format.
6. **No Style Dictionary (for now).** About 250 lines of resolver (`scripts/tokens/lib.ts`) cover
   the types we use, and every output here is custom (engine configs, Figma payload). Revisit if we
   need platforms we don't own (iOS, Android) or a DTCG feature the resolver lacks (`$extends`,
   colour spaces other than sRGB).

## Validation thresholds (`npm run tokens:validate`)

| Rule                   | Threshold                                                                                                                           | Applies to                                                                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Text contrast          | ≥ 4.5:1; **≥ 7:1 in `hc`**                                                                                                          | text.primary / muted / danger on every background; on-accent on accent and accent-hover; component `*.text` on its sibling `bg` (or the surface); data.positive / negative |
| Non-text contrast      | ≥ 3:1                                                                                                                               | border.control, focus.ring, status.*, data.reference-line, each categorical colour, against the surface                                                                    |
| Categorical separation | CIEDE2000 ≥ **10** for the first 8, ≥ **8** for all 10, under normal, deuteranopic and protanopic vision                            | color.data.categorical.1–10                                                                                                                                                |
| Sign separation        | ΔE₀₀ ≥ 10 under all three visions                                                                                                   | data.positive vs data.negative                                                                                                                                             |
| Sequential ramps       | lightness moves away from the surface, monotonically; each step 0.5–1.5× the mean step; stop 1 ΔE₀₀ ≥ 5 from the surface            | color.data.sequential.*                                                                                                                                                    |
| Diverging ramps        | arms mirror each other within 10 L*                                                                                                 | color.data.diverging.*                                                                                                                                                     |
| Integrity              | no broken references or cycles; hex matches components; same token set in every theme and every density; no unreferenced primitives | all                                                                                                                                                                        |

The colour-blind thresholds were set after searching the space: keeping today's first four series
colours, the best ten-colour palette that passes 3:1 on white reaches ΔE₀₀ ≈ 9–12 in the worst
pair. Ten colours that all differ by ≥ 10 for colour-blind viewers isn't achievable with
recognisable hues, which is why the stricter bar applies to the first 8 (the `chart-choice` skill
caps charts at 8 series).

## Consequences

- Changing a value means editing `tokens/` and running `npm run tokens:build`. The post-edit hook
  does it automatically, and the guard hook blocks edits to generated files.
- Engine quirks are isolated in one file each: Flint's hard-coded candlestick colours are remapped
  in `src/renderers/flintSpec.ts`, and engine policies are in `scripts/tokens/engines.ts`.
- `npm run lint:no-raw-values` fails on any colour or length outside `src/theme/`. Exceptions need
  a `raw-ok:` comment, and one that names a token must equal its value.
- Not done yet: a Tailwind v4 `@theme` block (Tailwind isn't installed; it will be generated in
  Phase 5 with shadcn) and the DESIGN.md front matter (Phase 2, so it can be checked against the
  pinned `@google/design.md` linter).
