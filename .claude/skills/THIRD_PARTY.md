# Third-party skills

Copied unchanged from [emilkowalski/skills](https://github.com/emilkowalski/skills) (MIT, © 2026
Emil Kowalski; each folder has its `LICENSE`) at commit `64eb3deb9a5fbfa041faf783e0bc3fd635872e9c`
(2026-11-15). Installed in Phase 6 (ADR-003) after review: prompt text only, no scripts.

| Skill                          | Use here                                                             |
| ------------------------------ | -------------------------------------------------------------------- |
| `emil-design-eng`              | Design-engineering principles for UI polish and motion decisions     |
| `review-animations`            | Strict review of motion changes (user-invoked: `/review-animations`) |
| `improve-animations`           | Audit all motion and write implementation plans                      |
| `find-animation-opportunities` | Where motion would help, and where it must not                       |
| `remove-animations`            | Motion the dashboards don't need                                     |
| `animation-performance`        | Frame-budget problems                                                |
| `choreograph`                  | Several elements animating together                                  |
| `pick-ui-library`              | Library choice before a new dependency (user-invoked)                |
| `break-ui`                     | Worst-case data against a component                                  |

Not installed: native/Expo/Swift, gestures, prototype, Sonner, taste-learning and Apple skills.

**Project rules win.** `CLAUDE.md`, `DESIGN.md`, the ADRs and the motion tokens override these
skills. In particular, `pick-ui-library`'s chart picks (recharts, Liveline) do not apply: charts
follow ADR-002 (Vega-Lite → Flint → D3 → Plotly). Any new dependency still needs an ADR.

**Updating:** re-copy from a newer commit, diff it, read the changes, and update the commit above.
Don't edit the copied files; put project-specific overrides in this file or `DESIGN.md`.
