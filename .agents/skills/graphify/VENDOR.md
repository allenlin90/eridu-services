# Vendored skill: graphify

`SKILL.md` and `references/` in this directory are vendored from the upstream `graphify` project, not authored here.

| Field | Value |
| --- | --- |
| Upstream | <https://github.com/Graphify-Labs/graphify> |
| PyPI package | `graphifyy` |
| Vendored version | see `.graphify_version` |
| License | Apache-2.0 |

## Local modifications

Keep this list current — anything not listed here should match upstream.

- `SKILL.md` Step 1: removed the `pip install --break-system-packages` fallback. It can corrupt a Homebrew-managed system Python on macOS, which is the assumed developer platform. The step now fails with an instruction to install `uv`.

## Updating

1. Re-vendor `SKILL.md` and `references/` from the new upstream release and update `.graphify_version`.
2. Re-apply every local modification listed above, or delete the entry if upstream fixed it.
3. Reconcile `AGENTS.md` § graphify (Knowledge Graph) and `.agents/rules/graphify.md` if the CLI surface changed.
4. Run `pnpm agents:index && pnpm agents:validate`.

Do not let `graphify claude install` or `graphify hook install` rewrite repository instruction files. Those generators write a `## graphify` block into `CLAUDE.md` and hooks into `.claude/settings.json` using their own defaults, which conflict with this repository's canonical layout. The agent-facing rule belongs in `AGENTS.md`, where Claude Code, Codex, and OpenCode all read it. `hook-guard` hooks are a per-developer opt-in in `.claude/settings.local.json` — see [Agentic Development Setup](../../../docs/engineering/AGENTIC_DEVELOPMENT_SETUP.md) §7.
