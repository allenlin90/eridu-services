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
