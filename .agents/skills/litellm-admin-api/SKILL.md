---
name: litellm-admin-api
description: Operate the LiteLLM Management API for models, access, keys, teams, users, budgets, and spend.
---

# LiteLLM Proxy Management API

Use this skill for the *mechanics* of calling LiteLLM's Management API. It does not decide what should change — it executes changes that [ai-workspace-control-plane](../ai-workspace-control-plane/SKILL.md) and `ai/litellm/README.md` already govern (model alias taxonomy, access groups, budget-tier policy, customer-tracking design).

## Before using this skill

- Read `ai-workspace-control-plane` and `ai/litellm/README.md` first if the task involves deciding *what* to configure (which alias, which access group, which budget tier), not just calling the API.
- Verify against the deployed version before relying on any endpoint. The baseline is LiteLLM `1.91.0`, pinned (see `ai/README.md`). The reference below is sourced from `docs.litellm.ai` (main branch, tracks latest release) and may still drift ahead of what's deployed. Spot-check unfamiliar payload shapes against the deployed instance's Swagger UI (`<host>/`, LiteLLM serves interactive docs at the proxy root) before scripting a mutation.
- `/model/info` and `/model/new` are documented as BETA by LiteLLM itself — treat their exact response shape as subject to change across versions.

## Authentication

- Header: `Authorization: Bearer <key>`.
- Two key tiers, not interchangeable:
  - The proxy's real `LITELLM_MASTER_KEY` — full admin, can call every route including inference. Lives only in the LiteLLM Railway service env; never put it in `ai/litellm/.env`, a script, or Open WebUI.
  - `LITELLM_ADMIN_KEY` — the key this skill actually uses. A scoped virtual key created via `/key/generate`, **deliberately restricted to `management_routes`** (models/keys/teams/users/customers/budgets/spend) with no inference/model-calling access (`/v1/chat/completions`, `/v1/model/info`, etc). This is an intentional access-control decision, not a gap — confirmed on this deployment: it gets 401 on admin-only routes like `/team/list` (needs an actual admin role, not just `internal_user`) and 403 on `/v1/model/info` (wrong route category). Don't "fix" a 401/403 by widening its scope — ask first if a task genuinely needs inference or org-admin access.
- Store `LITELLM_HOST` and `LITELLM_ADMIN_KEY` in `ai/litellm/.env` (gitignored; `ai/litellm/.env.example` documents the shape), mirroring how `ai/openwebui/.env` holds `OPEN_WEBUI_HOST`/`OPEN_WEBUI_API_KEY`. Read them from that file at call time. Per `ai-workspace-control-plane`, treat the value the same way as any credential: read it at call time, never print/log/echo/paste it into chat, commits, or scripts.
- If a task runs from inside the same Railway project/environment, prefer the private DNS address (`http://<litellm-service>.railway.internal:4000`) over the public host, per the control plane's private-networking-first posture. Use the public host only for admin UI access or external testing.
- Base path convention: management/admin routes live at the **root** (`/model/new`, `/key/generate`, `/team/new`, `/customer/new`, `/spend/logs`, `/global/spend/report`) — no `/api/v1` prefix, unlike Open WebUI. OpenAI-compatible inference/model-listing routes live under `/v1/...` (`/v1/chat/completions`, `/v1/model/info`). Check the path in each table before assuming one convention applies everywhere.

## Core rules

- **POST is the mutation verb for almost everything here, including delete.** `/model/delete`, `/key/delete`, `/team/delete`, `/customer/delete` are all POST, not DELETE/PUT. Check the actual method in [references/endpoints.md](references/endpoints.md) before assuming REST convention.
- **Updates here are commonly partial/patch-like, not full-object replace.** LiteLLM's own `/key/update` examples pass only the one field being changed (e.g. just `temp_budget_increase`, or just `guardrails`) alongside the required `key` identifier — unlike Open WebUI, where POSTing a config object silently clears unset fields. Don't invent a defensive GET-the-whole-object-first step this API doesn't ask for, but do GET first (`/key/info`, `/model/info`, `/team/info`) whenever you're unsure whether a field is patch-merged or replaced, and confirm on the live instance before shipping anything that touches budgets or access.
- **Models are DB-stored on this deployment, not `config.yaml`.** `ai/litellm/README.md` says the Admin UI ("Store Model in DB") is the management surface because Railway doesn't conveniently expose `config.yaml` — `/model/new`, `/model/update`, `/model/delete` write to that same DB-backed store, so this API is a scriptable equivalent to the UI flow, not a separate mechanism. Prefer it over manual UI clicks for repeatable changes; keep `ai/litellm/model-groups.example.yaml` as the source-of-truth reference for naming either way.
- **Use the repo's existing alias/access-group taxonomy.** Don't invent new model names or access groups ad hoc — reuse `company-fast` / `company-balanced` / `company-reasoning` / `company-coding` and the `company-general` / `company-power` / `company-admin` groups from `ai/litellm/README.md`. Set a model's group via `model_info.access_groups` in the `/model/new` or `/model/update` payload; grant a team access to a whole group by putting the group name in `/team/new`'s `models` array (LiteLLM treats access-group names and literal model names interchangeably in that field).
- **Virtual keys vs. customers/end-users are different limit layers — don't conflate them.** A virtual key (`/key/generate`) is a whole integration/team/app credential; a customer (`/customer/new`, keyed by `user_id`) is the individual Open WebUI end user forwarded via `x-litellm-customer-id`, per `ai-workspace-control-plane`. Setting `max_budget` on a key does not budget a single end user, and vice versa.
- **Treat delete and declarative-sync-shaped calls as destructive** (`/model/delete`, `/key/delete`, `/team/delete`, `/customer/delete`, `/user/delete`) — confirm with the user first, same as any other destructive action in this repo.
- **Master-key-only routes.** Team/org creation, global spend reports, and most `/user/*` role management need the master key or an org/team-admin-scoped key; a narrowly-scoped virtual key gets a 401/403. See the Team Member Permissions table in [references/endpoints.md](references/endpoints.md#access-control) before assuming a given key can call an arbitrary route.
- Don't duplicate policy design here — if the question is "what budget tier should this customer get" or "should this be a new team or a new key," go back to `ai-workspace-control-plane` / `ai/litellm/README.md`, not this skill.

## Quick verification

Confirm a key is live and see what it can reach before scripting further:

```bash
curl -sS -H "Authorization: Bearer $LITELLM_ADMIN_KEY" \
  "$LITELLM_HOST/model/info" | jq '.data | length'
```

Use the root `/model/info`, not `/v1/model/info` — confirmed against this deployment, a key scoped to `management_routes` can call the former but gets a 403 (`"Virtual key is not allowed to call this route. Only allowed to call routes: ['management_routes']"`) on the latter, which lives in a separate OpenAI-compatible route category. A `200` with a model count confirms the key works. A `401`/`403` means the key is invalid, revoked, or lacks the route permission — the error body names which route category it's missing (see [references/endpoints.md](references/endpoints.md#access-control)).

## Endpoint reference

See [references/endpoints.md](references/endpoints.md) for the full catalog grouped by resource: Models, Model Access Groups, Virtual Keys, Teams, Internal Users, Customers/End-Users, Budgets, and Spend/Usage.

## Quality gate

- [ ] `LITELLM_HOST` and `LITELLM_ADMIN_KEY` sourced from `ai/litellm/.env`, never hardcoded or echoed into logs/chat/commits.
- [ ] A route needing inference or org-admin access (outside `LITELLM_ADMIN_KEY`'s `management_routes` scope) isn't silently worked around — flagged to the user instead.
- [ ] A scoped virtual key used instead of the master key for anything recurring or lower-trust.
- [ ] Model/access-group names reuse the existing `company-*` taxonomy — no new ad hoc names.
- [ ] Delete or bulk-affecting calls confirmed with the user before executing.
- [ ] Endpoint/payload shape spot-checked against the deployed instance where the field is budget- or access-sensitive, not assumed from this reference alone.
- [ ] Policy source (`ai-workspace-control-plane`, `ai/litellm/README.md`) checked before making the change, not just the API mechanics.

## Related Skills

- [ai-workspace-control-plane](../ai-workspace-control-plane/SKILL.md) — governs what should change and why across the AI workspace platform, including LiteLLM routing/budget policy
- [openwebui-rest-api](../openwebui-rest-api/SKILL.md) — the equivalent mechanics skill for Open WebUI's REST API; the two proxies front different config surfaces and are not interchangeable
- [eridu-auth-oauth-provider](../eridu-auth-oauth-provider/SKILL.md) — SSO/OIDC identity that ultimately maps to LiteLLM customers via Open WebUI's forwarded user ID
