# ADR-004: Catalog distribution (registry, npm packages, or both)

- **Status:** Proposed (Phase 4, 2026-11-21); accepted at Gate 4
- **Deciders:** project owner, design-systems agent
- **References:**
  [shadcn registry: namespaces](https://github.com/shadcn-ui/ui/blob/shadcn@4.21.0/apps/v4/content/docs/registry/namespace.mdx) ·
  [shadcn registry: getting started](https://github.com/shadcn-ui/ui/blob/shadcn@4.21.0/apps/v4/content/docs/registry/getting-started.mdx) ·
  [components.json `registries`](<https://github.com/shadcn-ui/ui/blob/shadcn@4.21.0/apps/v4/content/docs/(root)/components-json.mdx>) ·
  [shadcn changelog, July 2026 (`registry:base`)](https://github.com/shadcn-ui/ui/blob/shadcn@4.21.0/apps/v4/content/docs/changelog/2026-07-base-ui-default.mdx) ·
  Gate 0 decision 3 (slim scope, no package split until a second app)

## Context

The brief describes two channels: a namespaced shadcn registry (`npx shadcn add @factory/<item>`,
copy-in code you own) and npm packages (`@factory/tokens`, `ui`, `panels`, `format`, `react`).
At Gate 0 we decided not to split into packages until a second app consumes the system. There is
one app today.

## Decision

1. **Registry first, packages later.** Every catalog item ships as a shadcn registry item under the
   `@factory` namespace, built with `shadcn build` from `registry/registry.json` into `public/r/`
   (Phase 5). Consumers add `"@factory": "<host>/r/{name}.json"` to `components.json` `registries`.
   The registry includes a `registry:base` config pinning Base UI (ADR-003), because items without
   one init as Base UI only by today's default.
2. **Item types:** atoms and molecules → `registry:ui`; organisms and templates → `registry:block`;
   themes → `registry:theme` (from the generated tokens); the format module and helpers →
   `registry:lib`. The LLD's `registryItem` is always `@factory/<id>`.
3. **`package` in each LLD is a boundary, not a package yet.** It records where the item will live
   when we split (`@factory/ui` for product UI, `@factory/panels` for analytics organisms,
   `@factory/format` for formatting). The split happens when the second app arrives, as its own
   ADR. Until then the code stays in `src/`, and imports must not cross a boundary backwards
   (`ui` never imports `panels`; Phase 8 adds a lint rule).
4. **Packs consume the registry.** Phase 7's `theme` pack applies a token theme and installs
   registry items with `shadcn add @factory/…`, so a pack never vendors component code itself.

## Consequences

- Copy-in means consumers own their copy and can drift. The catalog marks items with the registry
  version they came from (Phase 5), and the Advisor review (Phase 7) flags stale copies.
- Analytics organisms (KPI card, chart panel) depend on the spec runtime (`PanelSpec`, renderers).
  As registry blocks they carry those files as dependencies. That is the main argument for moving
  `panels` to npm first when a second app appears.
- No npm publishing pipeline is needed yet; `npm publish` stays denied in `.claude/settings.json`.
