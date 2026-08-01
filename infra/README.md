# Infrastructure

`infra/` owns repository-managed deployment material for services that are part of the Eridu runtime stack but are not first-party Turborepo applications.

## Scope

Place these here:

- upstream service wrappers and pinned-image policy;
- Dockerfiles, patches, bootstrap scripts, and configuration examples;
- local Docker Compose stack definitions;
- deployment-provider-neutral service documentation;
- read-only exports used to reconcile intended and deployed state.

Do not place these here:

- first-party NestJS or React application code (`apps/`);
- shared TypeScript packages (`packages/`);
- canonical company knowledge (`knowledge/` or its future private repository);
- reusable coding-agent skills (`.agents/skills/`);
- Railway-only service descriptors (`.railway/`).

## Railway services deployed from this repository

Most of the Eridu Railway stack is either a first-party app (`apps/`) or a pinned upstream
image configured in the Railway dashboard — see
[ai-platform-release-management](../.agents/skills/ai-platform-release-management/SKILL.md)
for the pin and rollback policy on those. The table below lists the services whose build
lives in this repository, so a change here is a change that needs deploying.

| Railway service | Source in repo | What it does | Trigger |
|---|---|---|---|
| `openwebui-sync` | [`ai/openwebui/`](../ai/openwebui/) (`Dockerfile`, `railway.json`, `railway-entrypoint.sh`) | Applies the Git-owned Open WebUI skill and model config to the live instance | Merge to `master` touching `ai/openwebui/skills/**`, `models/**`, or the runner's own files. Deploying the service *is* the run — it has no cron and exits after one pass. |

Build and deploy settings for these live in a `railway.json` beside the source, so the
dashboard is not the only record of how a service is built. Variables and secrets stay in
Railway — never in `railway.json`.

## Target Structure

```text
infra/
├── odoo/
├── openwebui/
├── litellm/
└── stacks/
    └── ai-workspace/
        ├── README.md
        ├── compose.yaml
        └── .env.example
```

The existing `ai/` directory is transitional. Open WebUI and LiteLLM deployment material should move here through a dedicated migration after active work targeting `ai/openwebui/` has settled.

See [Knowledge and Platform Layout](../docs/engineering/KNOWLEDGE_AND_PLATFORM_LAYOUT.md) for the ownership model, OKF boundary, and migration phases.
