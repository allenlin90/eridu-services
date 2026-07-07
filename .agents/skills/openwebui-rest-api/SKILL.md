---
name: openwebui-rest-api
description: Call the Open WebUI REST API directly to read or change server-side configuration — models, users, groups, knowledge, tools, functions, banners, and API keys. Use when scripting Open WebUI setup/config changes, verifying the OPEN_WEBUI_API_KEY in ai/openwebui/.env, or automating what openwebui-assistant-adapter designs as manifests.
---

# Open WebUI REST API

Use this skill for the *mechanics* of calling Open WebUI's HTTP API. It does not decide what should change — it executes changes that [ai-workspace-control-plane](../ai-workspace-control-plane/SKILL.md) and [openwebui-assistant-adapter](../openwebui-assistant-adapter/SKILL.md) already govern.

For two common, narrower jobs, use the more specific skill instead of re-deriving the workflow from the raw endpoint catalog here:
- Groups, permissions, or access grants (models/knowledge/tools) → [openwebui-groups-permissions](../openwebui-groups-permissions/SKILL.md)
- Wiring an MCP or OpenAPI tool server (e.g. this monorepo's `erify_api` MCP) → [openwebui-mcp-tool-integration](../openwebui-mcp-tool-integration/SKILL.md)

## Before using this skill

- Read `ai-workspace-control-plane` and `openwebui-assistant-adapter` first if the task involves deciding *what* to configure, not just calling the API.
- Confirm `ENABLE_API_KEYS` is enabled on the deployed instance and that the calling key's user has the needed permission (`workspace.models`, `workspace.knowledge`, admin role, etc.) — a valid Bearer token alone does not bypass per-user permission checks.
- Verify against the deployed version before relying on any endpoint. `ai-workspace-control-plane` records the deployed baseline as Open WebUI `0.9.6`; the endpoint catalog below is sourced from the `open-webui/docs` main branch and a community client, both of which track the latest release, not necessarily `0.9.6`. Spot-check exact payload shapes against the instance's own Swagger UI (`/docs`, when `ENV=dev`) before scripting a mutation.

## Authentication

- Header: `Authorization: Bearer <OPEN_WEBUI_API_KEY>`.
- Both the key and the base URL live in `ai/openwebui/.env` (`OPEN_WEBUI_API_KEY`, `OPEN_WEBUI_HOST`; the file is gitignored, `.env.example` documents the shape). Read them from that file at call time — never print, log, echo, or paste the key's value into chat, commits, or scripts.
- `OPEN_WEBUI_HOST` is the public/admin-reachable URL (see `ai/openwebui/.env.example` for the shape — don't paste the real value from `.env` into commits, chat, or scripts). If a task runs from inside the same Railway project/environment, prefer the private DNS address (`http://<service-name>.railway.internal:<port>`) instead, per `ai-workspace-control-plane`'s private-networking-first posture.
- Base path convention: most admin/config resources live under `/api/v1/...`; a few endpoints (chat completions, the plain models list) live directly under `/api/...`. Check the path column in [references/endpoints.md](references/endpoints.md) — don't assume one convention applies everywhere.

## Core rules

- **Read-modify-write for object configs.** `GET` the current config before `POST`-ing changes. Endpoints like `/api/v1/configs/models`, group updates, and tool access grants take the *whole* object — a partial payload silently clears unset fields.
- **POST is the mutation verb here, not just PUT/DELETE.** Open WebUI uses `POST` for update and even delete on several resources (`/model/update`, `/model/delete`). Check the actual method in the reference table before assuming REST convention.
- **Prefer the narrowest endpoint.** Use `/api/v1/models/model/update` to change one model rather than `/api/v1/models/sync`, which is a declarative reconcile that deletes any model absent from the payload.
- **Treat bulk/declarative/delete endpoints as destructive actions** (`models/sync`, `*/delete`, `groups/*/update` that touches permissions) — confirm with the user first, same as any other destructive operation in this repo.
- **Admin-only endpoints** (user list/role changes, group management, global configs) need an admin account's key; a non-admin key gets 401/403.
- Don't duplicate assistant/manifest design guidance here — if the question is "what should this assistant have access to," go back to `openwebui-assistant-adapter`, not this skill.

## Quick verification

Confirm a key is live and see what role/permissions it carries before scripting further:

```bash
curl -sS -H "Authorization: Bearer $OPEN_WEBUI_API_KEY" \
  "$OPEN_WEBUI_HOST/api/v1/auths/" | jq .
```

A `200` with the user's profile confirms the key works. A `401`/`403` means the key is invalid, revoked, or `ENABLE_API_KEYS` is off.

## Endpoint reference

See [references/endpoints.md](references/endpoints.md) for the full catalog grouped by resource: Auth/API keys, Users, Groups, Models, Configs, Knowledge, Files, Tools, Functions, and Chat/inference (OpenAI- and Ollama-compatible).

## Quality gate

- [ ] `OPEN_WEBUI_HOST` and `OPEN_WEBUI_API_KEY` are sourced from `ai/openwebui/.env`, never hardcoded or echoed into logs/chat/commits.
- [ ] GET-before-POST used for any config object that isn't a single scalar.
- [ ] Destructive or declarative-sync endpoints confirmed with the user before calling.
- [ ] Endpoint/payload shape spot-checked against the deployed instance's `/docs`, not assumed from this reference alone.
- [ ] Policy source (`ai-workspace-control-plane`, `openwebui-assistant-adapter`) checked before making the change, not just the API mechanics.

## Related Skills

- [ai-workspace-control-plane](../ai-workspace-control-plane/SKILL.md) — governs what should change and why across the AI workspace platform
- [openwebui-assistant-adapter](../openwebui-assistant-adapter/SKILL.md) — designs the Workspace Model manifests this API applies
- [openwebui-groups-permissions](../openwebui-groups-permissions/SKILL.md) — groups, permissions, and resource access-grant workflows built on this API
- [openwebui-mcp-tool-integration](../openwebui-mcp-tool-integration/SKILL.md) — MCP/OpenAPI tool server registration workflows built on this API
- [eridu-auth-oauth-provider](../eridu-auth-oauth-provider/SKILL.md) — SSO/OIDC identity that Open WebUI users authenticate through
