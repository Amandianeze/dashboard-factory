---
name: harness-maintenance
description: Checklist for changing the Claude Code harness itself — hooks, settings.json permissions, subagents, slash commands, skills, CLAUDE.md. Covers testing hooks with sample payloads and choosing hook vs skill vs lint rule. Use before editing anything under .claude/ or when a hook behaves unexpectedly.
---

# Maintaining the harness

Pick the mechanism by how strict it must be:

| Needs to happen…                          | Use                         | Why                                         |
| ----------------------------------------- | --------------------------- | ------------------------------------------- |
| Always, mechanically checkable            | lint rule / test / `verify` | Runs for humans and CI, not only for Claude |
| Always, tied to a tool call or stop event | hook                        | The harness runs it, the model cannot skip  |
| Usually, needs judgment                   | skill (or agent prompt)     | Loaded on demand; may be ignored            |
| Project-wide fact every task needs        | CLAUDE.md (keep it short)   | Always in context, so spend it sparingly    |

A rule that matters but exists only as prose will be broken. Prefer promoting it to a check.

## Changing a hook (`.claude/hooks/*.mjs`)

Hooks read a JSON payload on stdin; exit 0 = ok, exit 2 = block with stderr fed back to Claude.
Test by piping a payload instead of waiting for Claude to trigger it:

```
echo '{"tool_input":{"file_path":"'$PWD'/public/data/sales_daily.json"}}' \
  | CLAUDE_PROJECT_DIR=$PWD node .claude/hooks/guard-paths.mjs; echo "exit $?"
echo '{"stop_hook_active":false}' | CLAUDE_PROJECT_DIR=$PWD node .claude/hooks/stop-verify.mjs; echo "exit $?"
```

Check: a blocking case exits 2 with a message that names the fix command; an allowed case exits 0
silently; output is trimmed (`tail`), not a 2,000-line log.

Known properties to preserve or consciously change:

- `stop_hook_active` makes the Stop hook block only once; it cannot guarantee "never finishes red".
- Edit/Write hooks do not see Bash writes (`sed -i`, `>`); `guard-paths` is a guardrail, not a wall.
- `SubagentStop` runs `verify` for read-only agents (`verifier`, `design-reviewer`) that cannot fix
  anything. Scope it to writers (`spec-author`, `chart-builder`) or drop it.
- `post-edit` runs whole-project `tsc` per edit; keep an eye on its cost as the repo grows.
- `stop-verify` only watches `src dashboards scripts tests public`; edits to `package.json`,
  configs or `.claude/` do not trigger verify.

## Changing an agent or command (`.claude/agents`, `.claude/commands`)

- `tools:` is the permission boundary. Read-only agents get `Read, Glob, Grep, Bash` and no
  Edit/Write; say in the prompt what they must not do.
- Description = when to delegate to it. Make it specific and say what it returns.
- Commands should name the agent and the exact npm commands, in order, ending in a verify step.

## Changing a skill (`.claude/skills/*/SKILL.md`)

- Frontmatter `description` must say what it covers and **when to load it**.
- Keep it short; link to code (e.g. `RankedBars.tsx`) instead of pasting it.
- Anything a script can do belongs in `scripts/` with an npm command; the skill explains when to run it.
- Error tables must quote real validator messages from `src/spec/schema.ts` / `validate.ts`.

## Settings (`.claude/settings.json`)

Allowlist narrowly (`Bash(npm run:*)`, specific git reads). `deny` keeps `git push` and `npm publish`
off. New npm scripts are already covered by `npm run:*`.

## After any harness change

1. Update the matching line in `CLAUDE.md` (Harness section) if a guarantee or list changed.
2. Re-test the hook with a payload; run `npm run verify`.
3. Say what you changed and what you did not verify.
