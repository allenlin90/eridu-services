# nao — analytics agent

Build context for a `nao` Railway service running
[getnao/nao](https://github.com/getnao/nao), a chat UI that lets stakeholders
query data through an LLM-backed analytics agent. Deployment guide:
<https://docs.getnao.io/nao-agent/self-hosting/deployment-guide>.

**Status: scaffold only, not deployed.** This PR adds the build/config
material and documents the env vars. It does not provision a Postgres
instance, populate [`project/`](project/) with a real `nao_config.yaml`, or
create the Railway service. See [`project/README.md`](project/README.md) for
what's still needed before this is a working deployment.

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
| `OPENAI_API_KEY` | Yes | LLM provider key. This deployment standardizes on OpenAI. |
| `NAO_DEFAULT_PROJECT_PATH` | Yes | `/app/project` — matches where the git-context clone lands. |
| `NAO_CONTEXT_GIT_URL` | Yes | This repository's URL. |
| `NAO_CONTEXT_GIT_TOKEN` | Yes | HTTPS auth token to clone this private repo. |
| `NAO_CONTEXT_GIT_BRANCH` | Yes | Branch to clone, e.g. `master`. |
| `NAO_CONTEXT_GIT_SUBPATH` | Yes | `infra/nao/project` |
| `GCP_SERVICE_ACCOUNT_KEY_JSON` | If using a warehouse | Data-warehouse (e.g. BigQuery) credentials, referenced from `nao_config.yaml` via `{{ env(...) }}`. |
| `SMTP_HOST`, `SMTP_MAIL_FROM`, `SMTP_PASSWORD` | Optional, together | Email notifications. |
| `SMTP_PORT`, `SMTP_USER`, `SMTP_SSL` | Optional | Email notifications. |

Container listens on port `5005`.

## Railway wiring (once this is ready to actually deploy)

Follow the same pattern as every other service in this repo (see
`.railway/<service>.json` and [`infra/odoo/README.md`](../odoo/README.md) for
the reference example):

1. Create the service, connect it to `allenlin90/eridu-services`, root
   directory `infra/nao`.
2. Set `railwayConfigFile` to `.railway/nao.json`.
3. Add a Postgres plugin (or point `DB_URI` at an existing instance) and the
   env vars above as service variables.
4. Populate [`project/`](project/) with a real `nao_config.yaml` (see its
   README) and push — the container reads it via git clone at boot, no image
   rebuild needed.
5. First deploy: sign up as the first user directly in the app; add
   teammates via the admin interface afterward.

## Known gaps versus a working deployment

- No Postgres instance provisioned.
- `project/` is a placeholder — no real `nao_config.yaml`, so the container
  will fail to find a usable project until someone runs `nao init` and
  commits the result (see [`project/README.md`](project/README.md)).
- No data-warehouse credentials decided or provisioned.
- `NAO_CONTEXT_GIT_TOKEN` needs a scoped GitHub token (read-only, this repo
  only) — not yet created.
