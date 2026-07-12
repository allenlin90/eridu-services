---
name: ai-workspace-control-plane
description: Govern Open WebUI, LiteLLM, Better Auth SSO, Railway deployment, and MCP integration as one AI workspace control plane. Use when changing AI platform architecture, LiteLLM routing or budgets, Open WebUI assistant/model policy, SSO integration, MCP exposure, or files under ai/ and scripts/ai/.
---

# AI Workspace Control Plane

Use this skill when work touches the company AI workspace as a platform, not a single app feature.

## Purpose

Keep Open WebUI, LiteLLM, Better Auth, MCP services, and repo policy aligned as one governed system.

## Component ownership

| Component | Owns |
|---|---|
| `eridu_auth` / Better Auth | SSO, canonical user identity, roles/groups source |
| Open WebUI | User-facing chat workspace, Workspace Models, skills, knowledge, tool UX |
| LiteLLM | LLM gateway, model aliases, provider routing, virtual keys, customer budgets, RPM/TPM limits |
| `erify_api` MCP | Existing private operational MCP surface for read-only studio-scoped tools |
| `.agents/skills/` | Canonical agent skills and repo implementation guidance |
| `ai/` | Workspace policy manifests, import/export notes, LiteLLM references, budget-tier policy tables |

## Required source check

Before editing AI workspace files, read the relevant existing source:

- `ai/README.md`
- `ai/architecture/ai-workspace-summary.md`
- `ai/litellm/README.md`
- `ai/mcp/README.md`
- `ai/openwebui/README.md`
- `apps/erify_api/docs/MCP_SERVER.md`
- `.claude/memory/skills-integration.md`

## Core rules

- Do not treat Open WebUI, LiteLLM, and MCP as unrelated manual UI settings.
- Keep durable policy in Git; use deployed UIs for monitoring, debugging, and pilot-only changes.
- Use Better Auth as the identity source of truth.
- Use one LiteLLM virtual key for Open WebUI (never the master key), then forward the Open WebUI user identity as the LiteLLM customer/end-user ID via Open WebUI's global user-info header-forwarding env vars (`ENABLE_FORWARD_USER_INFO_HEADERS` + `FORWARD_USER_INFO_HEADER_USER_ID=x-litellm-customer-id`). Connection-level custom headers are unreliable on this Railway setup; do not rely on them.
- Treat usage tracking as automatic: LiteLLM records forwarded users as customers as requests arrive, with no pre-provisioning or sync step. Budget-tier assignment is a separate, later governance step.
- Apply per-user budget/rate policy at the LiteLLM customer/end-user layer.
- On this Railway deployment, manage LiteLLM models, provider credentials, and company model aliases through the LiteLLM Admin UI ("Store Model in DB") or its equivalent Management API (see [litellm-admin-api](../litellm-admin-api/SKILL.md)); `config.yaml` is not conveniently exposed either way. Treat repo `ai/litellm/` files as reference/policy for that surface (or a future repo-managed config path), not an actively-applied config.
- Use the stable company model aliases (`company-fast`, `company-balanced`, `company-reasoning`, `company-coding`) grouped into access groups (`company-general`, `company-power`, `company-admin`); do not invent a parallel alias taxonomy.
- Verify LiteLLM/Open WebUI capabilities against the deployed versions (LiteLLM `1.91.0`, tracks `main-stable` and moves — re-verify live; Open WebUI `0.10.2`, pinned) before presenting them as feasible; do not assume latest-docs behavior applies.
- Keep provider API keys in Railway environment variables, not repo files.
- Use the existing `erify_api` MCP entrypoint for operational MCP before proposing a separate MCP app.
- Keep operational MCP tools read-only unless auth, audit, idempotency, and rate-limit behavior are designed.
- The target deployment policy is an explicit Open WebUI and LiteLLM image tag with `autoUpdates: disabled`. Open WebUI satisfies it; LiteLLM's moving `main-stable` tag remains a remediation item. Route any version change through [ai-platform-release-management](../ai-platform-release-management/SKILL.md), including the initial LiteLLM pin.

## LiteLLM decision path

When changing LiteLLM policy:

1. Decide whether the change is model routing, key policy, customer budget, provider budget, or observability.
2. Put durable examples/templates under `ai/litellm/` as reference for the Admin UI / Management API.
3. Keep secrets as `os.environ/...` references.
4. For this Railway deployment, apply model/alias/credential changes in the LiteLLM Admin UI ("Store Model in DB"); `config.yaml` is not conveniently exposed. Repo files stay as reference until a repo-managed config path exists.
5. Preserve the distinction between:
   - virtual key limits = whole Open WebUI integration or team/app limit;
   - customer/end-user limits = individual Open WebUI user limit.
6. To actually call the LiteLLM Management API — create/update models, keys, teams, customers, or budgets — use [litellm-admin-api](../litellm-admin-api/SKILL.md); this skill governs the policy, that one covers the API mechanics.

## Open WebUI decision path

When changing Open WebUI workspace policy:

1. Define the assistant's business purpose.
2. Choose a LiteLLM model alias, not a raw provider unless explicitly needed.
3. Attach only the skills, knowledge, and MCP tools required for the role.
4. Check `.agents/skills/` before creating any new instruction content.
5. If the assistant needs repo implementation guidance, reference canonical `.agents` skills instead of duplicating them.
6. Use [wiki-knowledge-maintainer](../wiki-knowledge-maintainer/SKILL.md) when Git-authored company knowledge is added, reorganized, reviewed for staleness, or prepared for sync.

## MCP decision path

When changing MCP policy:

1. Check `apps/erify_api/docs/MCP_SERVER.md` first.
2. Confirm whether the tool is private/internal or public/external.
3. Keep private Railway MCP private-only unless a public access-control plan is implemented.
4. Preserve studio scoping and UID-shaped responses.
5. Log business-data access in the MCP service, not only in Open WebUI.
6. To actually register the MCP server as an Open WebUI tool-server connection and wire group access, use [openwebui-mcp-tool-integration](../openwebui-mcp-tool-integration/SKILL.md) and [openwebui-groups-permissions](../openwebui-groups-permissions/SKILL.md) — this skill governs the policy, those cover the API mechanics.

## Verification checklist

- [ ] Durable policy lives in Git, not only in a UI.
- [ ] Secrets remain in Railway/env vars.
- [ ] Open WebUI users map to LiteLLM customers/end users.
- [ ] Existing `erify_api` MCP surface is respected.
- [ ] `.agents/skills/` remains canonical for agent behavior.
- [ ] Open WebUI adapter docs do not contradict existing repo skills.

## Related Skills

- [eridu-auth-oauth-provider](../eridu-auth-oauth-provider/SKILL.md) — implementation details for eridu_auth acting as the OAuth2/OIDC identity server that Open WebUI (and future consumers) authenticate against
- [openwebui-rest-api](../openwebui-rest-api/SKILL.md) — endpoint reference and call mechanics for scripting Open WebUI configuration changes that this skill governs
- [openwebui-groups-permissions](../openwebui-groups-permissions/SKILL.md) — groups/permissions/access-grant mechanics
- [openwebui-mcp-tool-integration](../openwebui-mcp-tool-integration/SKILL.md) — MCP/tool-server registration mechanics
- [litellm-admin-api](../litellm-admin-api/SKILL.md) — LiteLLM Management API endpoint reference and call mechanics for models, keys, teams, customers, and budgets that this skill governs
- [wiki-knowledge-maintainer](../wiki-knowledge-maintainer/SKILL.md) — content ingestion impact analysis, semantic linting, review deadlines, consolidation, and routing maintenance for the Git-backed company wiki
- [ai-platform-release-management](../ai-platform-release-management/SKILL.md) — pin policy, upstream release checks, maintainer confirmation gate, and rollback for Open WebUI/LiteLLM version changes
