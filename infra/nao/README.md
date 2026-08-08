# nao — analytics agent

Build context for a `nao` Railway service running
[getnao/nao](https://github.com/getnao/nao), a chat UI that lets stakeholders
query data through an LLM-backed analytics agent. Deployment guide:
<https://docs.getnao.io/nao-agent/self-hosting/deployment-guide>.

**Status: Railway service provisioned, not yet running.** The `nao` service,
its dedicated Postgres, and a public domain exist in the `eridu-services`
Railway project. It builds from `infra/nao` on `master` — until PR #383
merges, Railway can't see [`Dockerfile`](Dockerfile) or `.railway/nao.json`
there, so the current build falls back to Railpack auto-detect and will fail.
See [`project/README.md`](project/README.md) for what's still needed in
`project/` itself before a successful build produces a working deployment.

## Why a plain `FROM getnao/nao:latest` image

nao's deployment guide offers two ways to get project files into the
container: `COPY` them into the image at build time, or set
`NAO_CONTEXT_GIT_URL`/`NAO_CONTEXT_GIT_SUBPATH` so the container clones them
at boot. This uses the git-clone approach against this same repository
(`infra/nao/project`) so project-context changes (new agent rules, model
definitions) ship as ordinary commits and don't require rebuilding the image —
only [`Dockerfile`](Dockerfile) itself needs a rebuild, and it never changes
in normal operation.

**A commit alone does not reach the running container.** nao clones its
context once, at boot — there's no periodic re-pull, no push mechanism, and
no drift risk (nothing writes back). What actually applies a new commit is a
**redeploy**, supplied today by `.railway/nao.json`'s
`watchPatterns: ["/infra/nao/**"]`: any commit under this path triggers
Railway to rebuild and restart the container, which re-clones fresh. This is
why [`project/`](project/) must stay under `infra/nao/` — content moved
outside the watch pattern would silently stop reaching the live agent on
every future commit, with no error anywhere.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | Yes | Signs auth sessions. Generate once, reuse across redeploys — rotating it forces every user to sign in again. |
| `BETTER_AUTH_URL` | Yes | Public URL of this deployment. |
| `DB_URI` | Yes | PostgreSQL connection string for nao's own application data (not the analytics warehouse). |
| `OPENAI_API_KEY` | Yes | A LiteLLM-issued virtual key, **not** a real OpenAI key. Per [ai-workspace-control-plane](../../.agents/skills/ai-workspace-control-plane/SKILL.md), LLM traffic routes through LiteLLM rather than calling a provider directly — same pattern as Open WebUI's own `OPENAI_API_KEY`. This key is scoped to the `MiniMax-M3` model only (minted via [litellm-admin-api](../../.agents/skills/litellm-admin-api/SKILL.md), `key_alias: nao-backend`). |
| `OPENAI_API_BASE_URL` | Yes | `http://${{LiteLLM.RAILWAY_PRIVATE_DOMAIN}}:4000/v1` — LiteLLM's internal endpoint. Whether nao itself actually honors this env var (vs. requiring the base URL to be set in its own Settings → Agent → Model Providers admin UI) is **unconfirmed** — nao's docs never named a base-URL override env var. Verify after first successful boot; if unhonored, set the equivalent in nao's admin UI instead. |
| `NAO_DEFAULT_PROJECT_PATH` | Yes | `/app/project` — matches where the git-context clone lands. |
| `NAO_CONTEXT_GIT_URL` | Yes | This repository's URL. |
| `NAO_CONTEXT_GIT_TOKEN` | Yes | HTTPS auth token to clone this private repo. |
| `NAO_CONTEXT_GIT_BRANCH` | Yes | Branch to clone, e.g. `master`. |
| `NAO_CONTEXT_GIT_SUBPATH` | Yes | `infra/nao/project` |
| `GCP_SERVICE_ACCOUNT_KEY_JSON` | If using a warehouse | Data-warehouse (e.g. BigQuery) credentials, referenced from `nao_config.yaml` via `{{ env(...) }}`. |
| `SMTP_HOST`, `SMTP_MAIL_FROM`, `SMTP_PASSWORD` | Optional, together | Email notifications. |
| `SMTP_PORT`, `SMTP_USER`, `SMTP_SSL` | Optional | Email notifications. |

Container listens on port `5005`.

## Railway wiring — done

Provisioned in the `eridu-services` Railway project, `production` environment
(service id `f4af6990-06ba-4872-8e01-63362a3b5d3f`), following the same
pattern as every other service here (see `.railway/<service>.json` and
[`infra/odoo/README.md`](../odoo/README.md) for the reference example):

1. Service `nao` created, connected to `allenlin90/eridu-services` branch
   `master`, root directory `infra/nao`.
2. `railwayConfigFile` set to `.railway/nao.json` — inert until PR #383
   merges (Railway resolves it against `master`, where the file doesn't exist
   yet; build currently falls back to Railpack auto-detect, see
   [`infra/odoo/README.md`](../odoo/README.md)'s note on this same gotcha).
3. Dedicated Postgres (`Postgres-RY3e`) provisioned; `DB_URI` wired as a
   reference variable (`${{Postgres-RY3e.DATABASE_URL}}`).
4. Public domain generated: `https://nao-production-e415.up.railway.app`,
   target port `5005`. `BETTER_AUTH_URL` set to it — this is nao's own
   canonical app URL for its self-hosted auth (session cookies, redirect
   construction), not an SSO integration setting; nao does not currently
   integrate with `eridu_auth` SSO.
5. All env vars above set except `NAO_CONTEXT_GIT_TOKEN` (see gaps below).

## Known gaps versus a working deployment

- **`NAO_CONTEXT_GIT_TOKEN` not set.** Needs a fine-grained GitHub PAT scoped
  to this repo, read-only `contents` permission. Only creatable via the
  GitHub UI (Settings → Developer settings → Fine-grained tokens) — not
  something `gh` CLI or this agent can generate. Without it the container
  cannot clone `project/` at boot.
- **`project/` is still a placeholder.** No real `nao_config.yaml` — the
  container will fail to find a usable project until someone runs `nao init`
  and commits the result (see [`project/README.md`](project/README.md)).
- **No data-warehouse credentials decided or provisioned** — what nao is
  allowed to query is a real access-scope decision, not an infra default.
- **PR #383 not merged.** Until it is, Railway builds against `master` where
  `infra/nao/` doesn't exist yet, so every build attempt fails. Deploys are
  currently held (`skip_deploys` on the variable writes) rather than left to
  crash-loop against a nonexistent path.
- **`OPENAI_API_BASE_URL` honor unconfirmed** — see the env var table above.
