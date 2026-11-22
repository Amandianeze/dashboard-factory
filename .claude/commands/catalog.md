---
description: Look up the design-system catalog before building anything
argument-hint: [what you need, e.g. "status badge" or "table"] (empty lists everything)
---

Look up the catalog for: $ARGUMENTS

1. Read `catalog.json` (generated from `docs/lld/*.md`; never edit it). Match the request against
   each item's `id`, `name` and `summary`, and its `atomicLevel` / `biLevel`.
2. For each match, report: id, name, status, atomic and BI level, one-line summary, and where it
   lives: `lld`, `story.url`, `registry.name` (install with `npx shadcn add <registry.name>`),
   and for organisms with `panel`, the dashboard `kind` and allowed `renderer`s.
3. Say plainly what to do next:
   - **beta / stable:** use it. Read its LLD (props, states, tokens) before using it.
   - **proposed:** it is a known gap (`gap.priority`, `gap.reason`). P1/P2 have a full LLD to build
     from; P3 is a stub. Don't improvise a substitute from another item.
   - **no match:** a new item needs a `proposed` LLD and an approval gate (ADR-005). Don't build it
     in the same step.
4. With no arguments, print the catalog grouped by atomic level with status and coverage counts.

Read-only: this command never edits files.
