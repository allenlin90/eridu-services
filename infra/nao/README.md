# nao — analytics agent

Build context for a `nao` Railway service running
[getnao/nao](https://github.com/getnao/nao), a chat UI that lets stakeholders
query data through an LLM-backed analytics agent. Deployment guide:
<https://docs.getnao.io/nao-agent/self-hosting/deployment-guide>.

**Status: Railway service provisioned, not yet running.** The `nao` service,
its dedicated Postgres, and a public domain exist in the `eridu-services`
Railway project, and it builds from `infra/nao` on `master` through
[`Dockerfile`](Dockerfile) and `.railway/nao.json`. What's still missing is
[`project/`](project/) itself — see [`project/README.md`](project/README.md)
and the known gaps below.

## Why a plain `FROM getnao/nao` image

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
| `OPENAI_API_BASE_URL` | Yes | `http://${{LiteLLM.RAILWAY_PRIVATE_DOMAIN}}:4000/v1` — LiteLLM's internal endpoint. **Unconfirmed** — nothing has booted yet, and nao's docs never named a base-URL override env var. If unhonored, set the equivalent in nao's own Settings → Agent → Model Providers admin UI instead. |
| `NAO_DEFAULT_PROJECT_PATH` | Yes | `/app/project` — intended to match where the git-context clone lands. **Unconfirmed** — same as above, nothing has booted yet to verify this. |
| `NAO_CONTEXT_GIT_URL` | Yes | This repository's URL. |
| `NAO_CONTEXT_GIT_TOKEN` | Probably not | HTTPS auth token for the context clone. **This repository is public** — an anonymous clone of `infra/nao/project` succeeds, so no credential should be required. Leave it unset unless nao proves it needs a value; see the gap below. If this repository ever goes private, the token's blast radius is the whole monorepo (`NAO_CONTEXT_GIT_SUBPATH` limits what gets *cloned*, not what a token can *fetch*), and a properly narrow fine-grained PAT is only mintable when the resource owner owns the repository — collaborator accounts cannot scope one to it. |
| `NAO_CONTEXT_GIT_BRANCH` | Yes | Branch to clone, e.g. `master`. |
| `NAO_CONTEXT_GIT_SUBPATH` | Yes | `infra/nao/project` — scopes what the clone checks out, not what a credential could read (see `NAO_CONTEXT_GIT_TOKEN` above). |
| `GCP_SERVICE_ACCOUNT_KEY_JSON` | If using a warehouse | Data-warehouse (e.g. BigQuery) credentials, referenced from `nao_config.yaml` via `{{ env(...) }}`. |
| `SMTP_HOST`, `SMTP_MAIL_FROM`, `SMTP_PASSWORD` | Optional, together | Email notifications. |
| `SMTP_PORT`, `SMTP_USER`, `SMTP_SSL` | Optional | Email notifications. |

Container listens on port `5005`.

## Railway wiring — done

Provisioned in the `eridu-services` Railway project, `production` environment
(service id `<nao-service-id>` — look it up via the Railway dashboard or MCP,
not hardcoded here since IDs and generated hostnames aren't stable across a
service recreate), following the same pattern as every other service here
(see `.railway/<service>.json` and [`infra/odoo/README.md`](../odoo/README.md)
for the reference example):

1. Service `nao` created, connected to `allenlin90/eridu-services` branch
   `master`, root directory `infra/nao`.
2. `railwayConfigFile` set to `.railway/nao.json`. Railway resolves it against
   `master`, so a build from a commit that predates the file falls back to
   Railpack auto-detect instead — see
   [`infra/odoo/README.md`](../odoo/README.md)'s note on this same gotcha.
3. Dedicated Postgres (`Postgres-RY3e`) provisioned; `DB_URI` wired as a
   reference variable (`${{Postgres-RY3e.DATABASE_URL}}`).
4. Public domain generated (Railway-assigned `*.up.railway.app` hostname,
   regenerable — look up the live value rather than assuming a fixed one),
   target port `5005`. `BETTER_AUTH_URL` set to it — this is nao's own
   canonical app URL for its self-hosted auth (session cookies, redirect
   construction), not an SSO integration setting; nao does not currently
   integrate with `eridu_auth` SSO.
5. All env vars above set, including a `NAO_CONTEXT_GIT_TOKEN` that this
   repository's public visibility should make unnecessary — see the gap below.

## Known gaps versus a working deployment

- **`NAO_CONTEXT_GIT_TOKEN` is set but shouldn't be needed, and the value is a
  classic PAT.** This repository is public — an unauthenticated
  `git-upload-pack` probe against it succeeds — so the context clone needs no
  credential at all. The value currently set is a `ghp_`-prefixed classic
  token, whose `repo` scope carries read *and write* access to every
  repository the issuing account can reach; `master` has no branch protection,
  so a leak means a direct push. Unset the variable, confirm the clone still
  works on first boot, and revoke the token. Only if nao turns out to require
  a value — it may build a `https://<token>@github.com/…` URL
  unconditionally — keep one, and prefer a credential with no scopes at all.
- **`project/` is still a placeholder.** No real `nao_config.yaml` — the
  container will fail to find a usable project until someone runs `nao init`
  and commits the result (see [`project/README.md`](project/README.md)).
- **No data-warehouse credentials decided or provisioned** — what nao is
  allowed to query is a real access-scope decision, not an infra default.
- **Boot-clone failure mode is unconfirmed.** nao's docs don't state whether
  a failed context clone (bad token, network error, wrong subpath) hard-fails
  the container or lets it start with empty/stale context — the difference
  between a loud outage and an agent silently running with no rules. The
  entire "a commit needs a redeploy to reach the live agent" contract above
  assumes the container actually re-clones on restart; verify both on first
  real boot.
- **Deploys are held.** The variable writes used `skip_deploys`, so nothing
  deploys until `project/` is populated — the service doesn't crash-loop
  against a missing config in the meantime.
- **`OPENAI_API_BASE_URL` honor unconfirmed** — see the env var table above.
