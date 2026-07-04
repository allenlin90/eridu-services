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
| `ai/` | Workspace policy manifests, import/export notes, LiteLLM templates, sync scaffolds |

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
- Use one LiteLLM virtual key for Open WebUI, then forward the Open WebUI user identity as the LiteLLM customer/end-user ID.
- Apply per-user budget/rate policy at the LiteLLM customer/end-user layer.
- Keep provider API keys in Railway environment variables, not repo files.
- Use the existing `erify_api` MCP entrypoint for operational MCP before proposing a separate MCP app.
- Keep operational MCP tools read-only unless auth, audit, idempotency, and rate-limit behavior are designed.

## LiteLLM decision path

When changing LiteLLM policy:

1. Decide whether the change is model routing, key policy, customer budget, provider budget, or observability.
2. Put durable examples/templates under `ai/litellm/`.
3. Keep secrets as `os.environ/...` references.
4. For Railway, prefer repo-managed config or env-generated config over manual container edits.
5. Preserve the distinction between:
   - virtual key limits = whole Open WebUI integration or team/app limit;
   - customer/end-user limits = individual Open WebUI user limit.

## Open WebUI decision path

When changing Open WebUI workspace policy:

1. Define the assistant's business purpose.
2. Choose a LiteLLM model alias, not a raw provider unless explicitly needed.
3. Attach only the skills, knowledge, and MCP tools required for the role.
4. Check `.agents/skills/` before creating any new instruction content.
5. If the assistant needs repo implementation guidance, reference canonical `.agents` skills instead of duplicating them.

## MCP decision path

When changing MCP policy:

1. Check `apps/erify_api/docs/MCP_SERVER.md` first.
2. Confirm whether the tool is private/internal or public/external.
3. Keep private Railway MCP private-only unless a public access-control plan is implemented.
4. Preserve studio scoping and UID-shaped responses.
5. Log business-data access in the MCP service, not only in Open WebUI.

## Verification checklist

- [ ] Durable policy lives in Git, not only in a UI.
- [ ] Secrets remain in Railway/env vars.
- [ ] Open WebUI users map to LiteLLM customers/end users.
- [ ] Existing `erify_api` MCP surface is respected.
- [ ] `.agents/skills/` remains canonical for agent behavior.
- [ ] Open WebUI adapter docs do not contradict existing repo skills.
