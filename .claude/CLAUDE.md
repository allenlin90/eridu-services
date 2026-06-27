# CLAUDE.md

This file exists because Claude Code auto-loads `.claude/CLAUDE.md`.

`../AGENTS.md` is the canonical shared instruction file for this repository. It is auto-imported below so its guidance — including the skill routing map for `../.agents/skills/` — is always in context. Follow it as the source of truth for shared behavioral and project-specific guidance.

@../AGENTS.md

## Claude Code Adapter Rules
- Do not duplicate shared repo guidance in this file.
- If this file and `../AGENTS.md` drift, follow `../AGENTS.md` for shared and project-level rules.
- Use this file only for Claude Code loading behavior and Claude-specific path notes.

## Claude-Specific Paths
| Artifact | Location | Notes |
| --- | --- | --- |
| Shared repo instructions | `../AGENTS.md` | Canonical source of truth |
| Skills | `../.agents/skills/` | Read skills directly from here |
| Workflows | `../.agents/workflows/` | Read workflows directly from here |
| Rules | `../.agents/rules/` | Supplemental house rules |
| Memory | `./memory/` | Supplementary deep-dive references |
| Subagents | `./agents/` | Claude-specific subagents |

## Suggested Claude Startup Flow
1. Read `../AGENTS.md`.
2. Load the relevant skill from `../.agents/skills/`.
3. Use `./memory/` only when you need extra reference depth after reading the canonical guidance.
