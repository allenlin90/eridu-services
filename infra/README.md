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

- [`odoo/`](odoo/) — custom image layering an OIDC patch onto stock Odoo.
- [`nao/`](nao/) — scaffold only, not yet deployed. See its README for status.

Every other Railway service in the Eridu stack is either a first-party app
(`apps/`) or a pinned upstream image configured in the dashboard — see
[ai-platform-release-management](../.agents/skills/ai-platform-release-management/SKILL.md)
for the pin and rollback policy on those.

Open WebUI configuration is applied by GitHub Actions, not by a Railway service:
[`openwebui-sync.yml`](../.github/workflows/openwebui-sync.yml) on merge, and
[`openwebui-drift.yml`](../.github/workflows/openwebui-drift.yml) weekly. A short script run
on a merge event does not justify a service to build, deploy, and maintain.

If a service whose build lives in this repository is ever added, list it here — a change to
its source is then visibly a change that needs deploying.

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
