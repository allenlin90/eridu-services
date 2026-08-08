# nao project context

This directory is `NAO_CONTEXT_GIT_SUBPATH` — a **sparse checkout root**. The
nao container clones only this subdirectory at boot and reads it directly as
its runtime instructions (`nao_config.yaml`, `RULES.md`, `agent/skills/*.md`,
model/database definitions), per
[nao's self-hosting deployment guide](https://docs.getnao.io/nao-agent/self-hosting/deployment-guide).
See [`../README.md`](../README.md) for the Railway service this feeds into.

## Governance

- **Git is the source of truth.** Nothing here is edited through a nao admin
  UI that writes back — there is no such surface. A commit here is the only
  way this content changes.
- **Reaching the live agent requires a redeploy**, not just a commit — see
  [`../README.md`](../README.md)'s "A commit alone does not reach the running
  container" section. Keep every file this directory needs inside
  `infra/nao/**` so the existing watch pattern keeps covering it.
- **Not an OKF knowledge concept.** This is executable agent configuration
  (secrets-interpolated via `{{ env('VAR_NAME') }}`, business-behavior rules,
  product-specific skill files nao itself interprets), not durable prose
  knowledge — it is not linked from `knowledge/index.md` and its Markdown
  files do not carry OKF frontmatter.
- **Not `.agents/skills/` content.** `agent/skills/*.md` here are nao's own
  product feature (analogous to `ai/openwebui/skills/`) — a vendored
  product's skill mechanism, not a reusable coding-agent skill for this repo.
- **If nao ever needs durable company knowledge** (metric definitions,
  business glossary, domain semantics) rather than agent behavior config,
  don't hand-author it here. Make `knowledge/` the source and treat whatever
  lands under a future `docs/` subdirectory here as a **generated publication
  artifact** derived from that bundle — the same category `wiki-knowledge-maintainer`
  and the OKF contract already define — instead of duplicating company
  knowledge inside a vendor adapter.
- **Secrets never live in this directory.** Reference them from
  `nao_config.yaml` via `{{ env('VAR_NAME') }}` and set the actual value as a
  Railway service variable.

## Nothing has been generated here yet

The real contents depend on business decisions this scaffold doesn't make:
which warehouse/database nao should query, what schemas and models it's
allowed to see, and what rules/skills the agent should follow. Fabricating a
`nao_config.yaml` without that input would ship a config nobody validated
against a real database.

To populate this directory for a real deployment:

1. Install `nao-core` locally (`pip install nao-core`).
2. Run `nao init` from this directory and follow the prompts (project name,
   database connection, optional Slack integration).
3. Run `nao debug` and `nao sync` to verify the generated config against a real
   database/warehouse connection.
4. Commit the generated files here, replacing this placeholder.
5. Push to a branch that triggers the Railway watch pattern (or merge to the
   deployed branch) so the running container picks it up.
