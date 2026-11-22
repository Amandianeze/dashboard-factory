# ADR-003: Primitives (Base UI vs Radix under shadcn) and the icon set

- **Status:** Accepted (Gate 4, 2026-11-21)
- **Deciders:** project owner, design-systems agent
- **References:**
  [shadcn changelog, July 2026: Base UI as the default](https://github.com/shadcn-ui/ui/blob/shadcn@4.21.0/apps/v4/content/docs/changelog/2026-07-base-ui-default.mdx) ·
  [shadcn changelog, January 2026: Base UI docs](https://github.com/shadcn-ui/ui/blob/shadcn@4.21.0/apps/v4/content/docs/changelog/2026-01-base-ui.mdx) ·
  [shadcn CLI (`init -b`, `migrate radix`, `migrate icons`)](<https://github.com/shadcn-ui/ui/blob/shadcn@4.21.0/apps/v4/content/docs/(root)/cli.mdx>) ·
  [components.json `iconLibrary`](<https://github.com/shadcn-ui/ui/blob/shadcn@4.21.0/apps/v4/content/docs/(root)/components-json.mdx>) ·
  [Base UI](https://base-ui.com) · [Radix Primitives](https://www.radix-ui.com/primitives) ·
  [Lucide](https://lucide.dev) · npm registry (versions checked 2026-11-21)

## Context

The catalog needs accessible primitives for its interactive atoms and molecules (Button, Tooltip,
Select, Field, and later Dialog and Popover). The brief names shadcn/ui as the component source and
asks us to choose Radix or Base UI under it, and an icon set. Nothing in the repo uses either yet:
the only controls are a native `<select>` and `aria-pressed` buttons in the filter bar.

What the current sources say (checked 2026-11-21):

- shadcn rebuilt every component for Base UI with the same abstraction (Dec 2025) and made **Base UI
  the default** in July 2026. Radix is not deprecated; new components ship for both. `init -b radix`
  opts out; registries can pin a library with a `registry:base` config.
- Base UI is stable: `@base-ui/react` **1.9.0** on npm. (The old `@base-ui-components/react` name
  stopped at 1.0.0-rc.0; don't use it.) Radix: `radix-ui` 1.8.1.
- shadcn's default icon set is **Lucide** (`lucide-react` 1.77.0). `npx shadcn migrate icons`
  moves between lucide, tabler, hugeicons, phosphor and remixicon if we ever need to.

## Decision

1. **Base UI** (`@base-ui/react`, pinned at Phase 5 install) under shadcn, initialised with the
   default base. Reasons: it is shadcn's default and recommendation for new projects, so registry
   items we pull in arrive in the right flavour without transformation; it is built by the Radix
   authors with what they learned; and we have no Radix code to migrate.
2. **Lucide** (`lucide-react`) as the icon set, `iconLibrary: "lucide"` in `components.json`.
   Icons are imported one by one (tree-shaken), sized from the type scale and coloured with
   `currentColor` so they follow text tokens. The **Icon** atom wraps them so the set can be
   swapped in one place.
3. **Keep native controls where they are better.** The filter `Select` stays a native `<select>`
   (keyboard, mobile pickers and screen readers for free). A Base UI select is added only when we
   need something native can't do (search, multi-value display).

## Consequences

- shadcn components assume **Tailwind v4** and CSS variables. The repo has no Tailwind today.
  `tokens:build` already emits shadcn variable aliases. Phase 5 adds Tailwind v4 with a generated
  `@theme` block, scoped so existing `styles.css` keeps working while components migrate.
- Base UI APIs differ from Radix (`render` instead of `asChild`; `onOpenChange` gets event details;
  `data-open` instead of `data-state`). LLDs and stories use the Base UI names.
- The brief asks for `pick-ui-library` before any new dependency. That skill isn't installed. This
  ADR records the comparison it would ask for; install the skill in Phase 6 with the other Emil
  skills, and rerun it before Phase 5 adds the packages.
- Revisit if Base UI drops a component we need that Radix has, or shadcn reverses its default.

## Amendment, Phase 5 (2026-11-22): accepted (Gate 5a, 2026-11-22)

- **Tailwind is utilities only.** The consequence above said Phase 5 would add a generated `@theme`
  block. It didn't: `src/theme/tailwind.css` loads utilities with no theme and no preflight, and
  classes reference token variables directly. This keeps `tokens/` the only source of values.
  Its cost is that scale utilities, including `m-0` and `top-0`, silently generate nothing;
  `tests/unit/tailwind-classes.test.ts` fails on any in `src/`.
- **`pick-ui-library` was not rerun** before the packages were added, because it isn't installed.

## Note, Phase 6 (2026-11-22)

`pick-ui-library` and the other Emil Kowalski skills are installed (owner's go, 2026-11-22), copied
unchanged at a pinned commit; see `.claude/skills/THIRD_PARTY.md`. Run `/pick-ui-library` before
any new dependency from now on. Its chart picks don't apply here: charts follow ADR-002.
