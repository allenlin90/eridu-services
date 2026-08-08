# nao project context (placeholder)

This directory is `NAO_CONTEXT_GIT_SUBPATH` — the analytics-agent project nao clones
and reads at container boot (`nao_config.yaml`, database/model definitions, agent
skills, `.naoignore`, `RULES.md`, etc.), per
[nao's self-hosting deployment guide](https://docs.getnao.io/nao-agent/self-hosting/deployment-guide).

**Nothing has been generated here yet.** The real contents depend on business
decisions this scaffold doesn't make: which warehouse/database nao should query,
what schemas and models it's allowed to see, and what rules/skills the agent
should follow. Fabricating a `nao_config.yaml` without that input would ship a
config nobody validated against a real database.

To populate this directory for a real deployment:

1. Install `nao-core` locally (`pip install nao-core`).
2. Run `nao init` from this directory and follow the prompts (project name,
   database connection, optional Slack integration).
3. Run `nao debug` and `nao sync` to verify the generated config against a real
   database/warehouse connection.
4. Commit the generated files here, replacing this placeholder README.
5. Reference secrets (warehouse credentials, DB URIs) via `nao_config.yaml`'s
   `{{ env('VAR_NAME') }}` interpolation — never hardcode them in this repo.

See [`../README.md`](../README.md) for the Railway service wiring this directory
feeds into.
