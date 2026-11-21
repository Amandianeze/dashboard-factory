# ADR-005: Versioning, deprecation and contribution flow

- **Status:** Proposed (Phase 4, 2026-11-21); accepted at Gate 4
- **Deciders:** project owner, design-systems agent
- **References:**
  [Atomic Design, ch. 5 "Maintaining design systems"](https://atomicdesign.bradfrost.com/chapter-5/) ·
  [Semantic Versioning 2.0.0](https://semver.org/) · ADR-001 (tokens) · ADR-004 (distribution)

## Context

Frost's chapter 5 treats a design system as a product: it needs owners, a way to propose and accept
changes, visible versions, and a deprecation path that doesn't break the screens built on it. The
catalog now has statuses (`proposed`, `beta`, `stable`, `deprecated`) but no rules for moving
between them.

## Decision

**One version for the whole system** (in `catalog.json` and a root `CHANGELOG.md`) until the
package split in ADR-004; after that, one version per package. Semver:

| Change                                                                | Bump  |
| --------------------------------------------------------------------- | ----- |
| Remove or rename a token, item, prop or panel `kind` without an alias | major |
| Rename a token **with** an alias kept for one minor (ADR-001 tiers)   | minor |
| New item, new optional prop, new token, `beta → stable`               | minor |
| Visual fix within the item's LLD (token value change, bug fix)        | patch |
| A brand change that edits primitives only                             | minor |

**Status lifecycle**

- **proposed:** a gap with a reason and priority. Nothing built. Not usable as a panel `kind`.
- **beta:** built and used, LLD written, story or tests incomplete. Usable; may still change in a minor.
- **stable:** LLD, story (states, break-ui, a11y passing), registry item and tests all present
  (the Phase 5 `catalog:check` enforces it). Breaking changes need a major.
- **deprecated:** `replacement` names the item to use instead. It keeps working for **two minor
  releases**, then is removed in the next major. Validation warns on every use.

**Contribution flow** (proposal → LLD PR → design review → build → gate):

1. **Proposal:** add a `proposed` stub in `docs/lld/` with a gap reason and priority. Agents must
   check `catalog.json` first; an existing item is extended, not duplicated.
2. **LLD PR:** the full LLD (front matter + body from `_template.md`). Merged only when
   `npm run lld:check` passes and the owner approves the API.
3. **Design review:** the `design-reviewer` agent checks it against `DESIGN.md` and the LLD.
4. **Build:** code, story and registry item, with status moving to `beta`.
5. **Gate:** `beta → stable` when coverage checks pass and the item has been used on a real page.

Taste changes (Do's and Don'ts) keep their own path: `npm run design:taste` and a PR (Gate 2).

**Owner:** the project owner approves LLDs and status changes. Agents may propose and build, never
self-approve.

## Consequences

- `CHANGELOG.md` starts at 0.1.0 (the current `package.json` version) when Phase 5 publishes the
  first registry build. Changes before that are in the gate reports.
- Removing a duplicate on the Gate 3 deprecation list is a patch when the replacement is a drop-in
  (same look, same API), otherwise a minor with the old path deprecated.
- Phase 8 automates the checks this ADR describes (deprecation warnings, semver hints from the
  token and catalog diffs).
