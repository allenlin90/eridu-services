# Open WebUI API Endpoint Catalog

Sourced from `open-webui/docs` (main branch, `docs/reference/api-endpoints.md`) and the community
client reference at `whogben.github.io/owui_client` (reverse-engineered from the FastAPI routers).
The community source fills in resources (users, groups, configs, knowledge, tools) that the
official page doesn't enumerate; treat its exact request/response field names as a starting point,
not a guarantee — confirm against the live instance's `/docs` Swagger UI (available when `ENV=dev`)
before shipping a script that depends on a specific payload shape.

All paths below are relative to the deployed base URL (not committed to this repo — pass it in via
env, e.g. `OPEN_WEBUI_BASE_URL`).

## Auth & API keys — `/api/v1/auths`

| Method | Path | Purpose | Notes |
|---|---|---|---|
| GET | `/api/v1/auths/` | Current session user: profile, permissions, role | Good smoke-test endpoint |
| POST | `/api/v1/auths/update/profile` | Update name/bio/gender/dob/profile image | |
| GET | `/api/v1/auths/api_key` | Get the current user's API key | |
| POST | `/api/v1/auths/api_key` | Generate/rotate the current user's API key | Invalidates the previous key |
| DELETE | `/api/v1/auths/api_key` | Delete the current user's API key | |
| DELETE | `/api/v1/auths/oauth/sessions/{provider}` | Delete an OAuth session for a provider | Relevant to `eridu-auth-oauth-provider` SSO flow |

Global prerequisites (env vars on the Open WebUI service, admin-set):
- `ENABLE_API_KEYS=true` — required before any user can use API keys at all.
- `USER_PERMISSIONS_FEATURES_API_KEYS` — controls whether non-admin users can create their own keys (admins always can once the feature is globally enabled).
- `ENABLE_API_KEYS_ENDPOINT_RESTRICTIONS=true` + `API_KEYS_ALLOWED_ENDPOINTS=/api/chat/completions,/api/v1/models` — scopes a key to an allow-list of routes. Check this before assuming a given key can call an arbitrary endpoint.

## Users — `/api/v1/users` (admin-only unless noted)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/users/all` | List all users (abbreviated info) |
| POST | `/api/v1/users/default/permissions` | Set the instance-wide default `UserPermissions` baseline |

The community client also exposes user role/permission/deletion management under this prefix;
confirm exact paths on the live instance before scripting bulk user changes.

## Groups — `/api/v1/groups` (admin-only)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/groups/create` | Create a new group (name, description, `permissions` object) |
| POST | `/api/v1/groups/id/{id}/update` | Update an existing group's details/permissions — replaces the object, GET first |
| POST | `/api/v1/groups/id/{id}/users/add` | Add one or more user IDs to a group |
| POST | `/api/v1/groups/id/{id}/users/remove` | Remove one or more user IDs from a group |

For the full permission schema (`workspace`/`sharing`/`chat`/`features`) and the group/access-grant
workflow, see [openwebui-groups-permissions](../../openwebui-groups-permissions/SKILL.md).

## Models — `/api/models`, `/api/v1/models`

| Method | Path | Purpose | Permission |
|---|---|---|---|
| GET | `/api/models` | All models created/added via Open WebUI | Any user |
| GET | `/api/v1/models/export` | Export custom models as a JSON array | Any user |
| POST | `/api/v1/models/import` | Bulk upsert models (create/update only, never deletes) | Admin or `workspace.models_import` |
| POST | `/api/v1/models/sync` | **Declarative reconcile** — creates, updates, *and deletes* models not in the payload | Admin — destructive, confirm first |
| POST | `/api/v1/models/create` | Create one model (ID must be unique, ≤256 chars) | Admin or `workspace.models` |
| POST | `/api/v1/models/model/update` | Update one model (payload must include `id`) | Admin or `workspace.models` |
| POST | `/api/v1/models/model/delete` | Delete one model by `id` | Admin or `workspace.models` |

Prefer `create` / `model/update` / `model/delete` for single-model changes; reserve `sync` for an
intentional full reconcile since it silently deletes anything missing from the payload.

**`/api/v1/models/model/update` is broken on `0.10.2`** — confirmed live: it returns a bare `500
Internal Server Error` (no JSON body) for essentially any payload, including a fresh disposable
model with a trivial `{id, name, base_model_id, meta: {description}, params: {}}` body. Not a
payload-shape issue on the caller's side — a minimal payload missing required fields correctly
returns a `422` with field-level detail from the same endpoint, so routing/validation works; the
handler itself throws once past validation. **Workaround: delete the model and recreate it via
`/api/v1/models/create`** (same `id`, full desired state) instead of trying to `update` in place.

**A model's `meta.knowledge[]` entry must include `"type": "collection"`** (for a knowledge base;
`"file"` or `"note"` for those) or the builtin `list_knowledge`/`query_knowledge_files` tools
silently skip it — `backend/open_webui/tools/builtin.py` branches on `item.get('type')` and has no
fallback for a missing type. Confirmed live: an assistant created with a knowledge entry copied
verbatim from `GET /api/v1/knowledge/{id}` (which has no `type` field at all) answered every
knowledge question with "no documents were available" — a real assistant, not a broken retrieval
pipeline. A working entry needs `type` (and ideally the other fields a real Open WebUI-authored
entry carries, e.g. `user`) added explicitly; don't assume the raw Knowledge object is attach-ready.

## Configs — `/api/v1/configs`

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/configs/models` | Get the full models configuration (`ModelsConfigForm`) |
| POST | `/api/v1/configs/models` | Set the full models configuration — GET first, this replaces the object |
| GET | `/api/v1/configs/models/defaults` | Get only `DEFAULT_MODEL_METADATA` (any verified user) |
| GET | `/api/v1/configs/banners` | Get current banners |
| POST | `/api/v1/configs/banners` | Replace the banners list — GET first |
| GET | `/api/v1/configs/tool_servers` | Get the `TOOL_SERVER_CONNECTIONS` list (MCP + OpenAPI tool servers) |
| POST | `/api/v1/configs/tool_servers` | Replace the full tool-servers list — GET first |
| POST | `/api/v1/configs/tool_servers/verify` | Dry-run a single connection; returns discovered specs/tools without persisting |

For the tool-server connection shape and the erify_api MCP wiring workflow, see
[openwebui-mcp-tool-integration](../../openwebui-mcp-tool-integration/SKILL.md).

## Knowledge — `/api/v1/knowledge`

| Method | Path | Purpose | Permission |
|---|---|---|---|
| GET | `/api/v1/knowledge/list` | Knowledge bases the user has write access to | Any user with access |
| POST | `/api/v1/knowledge/create` | Create a knowledge base. Body `{"name": str, "description": str, "access_grants": Optional[list[dict]]}`. **Confirmed live on `0.10.2`** (full disposable-collection test, see `ai/architecture/llm-knowledge-base-plan.md` Phase 0). | `workspace.knowledge` (+ `sharing.public_knowledge` for public; otherwise forced private) |
| DELETE | `/api/v1/knowledge/{id}/delete` | Delete a knowledge base. **Confirmed live on `0.10.2`** — verified with a fresh `GET` returning 404 after. | Owner/admin |
| POST | `/api/v1/knowledge/{id}/file/add` | Add an uploaded file to a knowledge collection. Body `{"file_id": str, "directory_id": Optional[str]}`. Triggers embedding synchronously inside this call — polling `process/status` first is still correct practice (matches the async upload step) but this endpoint doesn't strictly require `status: completed` first, only that the file has *some* processed data (`FILE_NOT_PROCESSED` only fires if `file.data` is empty). **Confirmed live on `0.10.2`.** | Owner, write-access grantee, or admin |
| POST | `/api/v1/knowledge/{id}/access/update` | Full-replace `access_grants` for a knowledge base — body `{"access_grants": [...]}`. **No `id/` segment** — different shape from the tools path below. **Confirmed live on `0.10.2`**, both via source (`backend/open_webui/routers/knowledge.py`) and a real mutation + independent re-`GET`. | Owner, write-access grantee, or admin |

## Files & retrieval — `/api/v1/files`, `/api/v1/retrieval`

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/files/` | Upload a file for RAG processing. Multipart form-data, field name `file`. Response includes `id`, `filename`, `meta`. **Confirmed live on `0.10.2`.** |
| GET | `/api/v1/files/{id}/process/status` | Poll processing status — required before the file is usable. Returns `{"status": "pending"\|"completed"\|"failed"}` (non-streaming; add `?stream=true` for SSE). **Confirmed live on `0.10.2`** — completed instantly for small text files. |
| DELETE | `/api/v1/files/{id}` | Delete a file. Also cleans up its knowledge-base associations and vector embeddings automatically — no separate step needed to remove it from a collection first. **Confirmed live on `0.10.2`.** |
| POST | `/api/v1/retrieval/process/web` | Fetch a URL and store it in a knowledge collection |

### Citation behavior (confirmed on a live disposable test, `0.10.2`)

`POST /api/chat/completions` with `files: [{type: "collection", id}]` returns a `sources` array whose `metadata[i]` correctly corresponds to `document[i]` — tested with two documents containing distinct, verifiable facts; the model both retrieved and cited the correct one. No sign of the community-reported citation-collapse issue on this path. **This only covers direct `files`-param injection on a raw model** — it does not confirm whether Native function calling's `query_knowledge_files` tool call (the path an assistant with *attached* knowledge actually uses) exhibits the same behavior. Verify that path specifically, ideally via a temporary test assistant, before relying on assistant-attached citation quality.

## Tools — `/api/v1/tools`

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/tools/create` | Create a tool (ID, name, Python content) |
| POST | `/api/v1/tools/id/{id}/access/update` | Set read/write access grants per user/group |

## Skills — `/api/v1/skills`

**Confirmed live on `0.10.2`**, including on-demand loading behavior — see `ai-platform-capability-verification` skill and `ai/architecture/llm-knowledge-base-plan.md` (Skills Versus Knowledge § Routing And Indexing At Scale).

| Method | Path | Purpose | Notes |
|---|---|---|---|
| POST | `/api/v1/skills/create` | Create a skill. Body `{id, name, description, content, access_grants}`. | `is_active: true` by default (unlike Functions, no separate toggle needed). `id` gets lowercased and space-to-hyphen normalized server-side. |
| POST | `/api/v1/skills/id/{id}/update` | Replace a skill — same body shape as `/create`. | |
| POST | `/api/v1/skills/id/{id}/access/update` | Set read/write access grants — same normalized-grant shape as knowledge/tools. | |
| DELETE | `/api/v1/skills/id/{id}/delete` | Delete. | |

**On-demand loading**: a skill attached via `skill_ids: [...]` on a chat completion (or via a model's `meta.skillIds`) loads on demand — the model receives only a compact `<available_skills>` manifest (id/name/description) and must call the builtin `view_skill(id)` tool to get full content — **provided the request has a valid top-level `session_id`** (not nested under `metadata`) and the model isn't using legacy function calling. A skill explicitly `$mention`-ed in the message, or a request without a valid `session_id`, gets its full content injected directly instead — verify which behavior a given caller actually triggers rather than assuming.

## Resource access grants (models, knowledge, tools, skills, prompts)

Per-resource sharing is a normalized grant, not a field on the group: `{resource_type, resource_id,
principal_type: user|group, principal_id, permission: read|write}` (`principal_type: user` +
`principal_id: "*"` means public). Each resource type has its own `.../access/update` endpoint, but
**the exact path shape differs per resource type — don't assume one prefix's shape by analogy to
another's.** Tools and skills both use an `id/` segment (`tools/id/{id}/access/update`,
`skills/id/{id}/access/update`); knowledge bases don't (`knowledge/{id}/access/update`) — each
confirmed above from its own source, not inferred from the others. Verify the actual
path for a resource type before scripting a mutation against it — a wrong guess here can silently
404, or worse, hit a different endpoint than intended. See
[openwebui-groups-permissions](../../openwebui-groups-permissions/SKILL.md) for the workflow that
ties groups to these grants.

## Functions — `/api/v1/functions`

**Confirmed live on `0.10.2`** — registered, activated, triggered via chat completion, and torn down as part of building the knowledge-base Sync Pipe (`ai/openwebui/functions/sync-pipe.py`, `ai/architecture/llm-knowledge-base-plan.md` Sync Contract).

| Method | Path | Purpose | Notes |
|---|---|---|---|
| POST | `/api/v1/functions/create` | Register a Function. Body `{id, name, content, meta: {description}}` — `id` must be a valid Python identifier. | Admin-only, regardless of `direct_tool_servers` permission (that only covers OpenAPI tool servers). Function `type` (`pipe`/`filter`/`action`/`event`) is auto-detected from which class (`Pipe`/`Filter`/`Action`/`Event`) the submitted `content` defines — not passed explicitly. `is_active` defaults to `false`. |
| POST | `/api/v1/functions/id/{id}/toggle` | Activate/deactivate. Must be called (or already active) before a `pipe` is listed in `/api/models` or callable via chat completions. | |
| POST | `/api/v1/functions/id/{id}/update` | Replace content — same body shape as `/create`. | |
| DELETE | `/api/v1/functions/id/{id}/delete` | Delete. | |
| POST | `/api/v1/functions/id/{id}/valves/update` | Set the Function's admin-configured `Valves` (a Pydantic model declared in the Function's own code) — full-replace body matching the Valves schema. | Use this to pass secrets (e.g. an API key) rather than hardcoding them in committed Function source. |

A `pipe`-type Function becomes callable exactly like a model: `POST /api/chat/completions` with `model: "<function-id>"`. **`pipe()` must be declared `async def` and use an async HTTP client if it calls back into Open WebUI's own API** — a synchronous `pipe()` using a blocking HTTP client (e.g. `requests`) deadlocks on the self-call, since it occupies the same event-loop thread that would need to handle the nested request. See `ai/openwebui/functions/README.md` for this and other gotchas found during verification (e.g. `GET /api/v1/knowledge/{id}` never populating `files` on `0.10.2` — use `GET /api/v1/knowledge/{id}/files` instead).

## Chat & inference

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/chat/completions` | OpenAI-compatible chat completion; supports tool calls and `files: [{type: "collection", id}]` for RAG |
| POST | `/api/message` | Anthropic Messages API compatible |
| POST | `/api/v1/messages` | Anthropic Messages API compatible, streaming |
| POST | `/api/chat/completed` | Run outlet filters on an already-completed chat payload |
| GET | `/ollama/api/tags` | List available Ollama models (proxy) |
| POST | `/ollama/api/generate` | Ollama generate, streaming |
| POST | `/ollama/api/embed` | Ollama embeddings |
| POST | `/ollama/v1/responses` | OpenAI Responses API format via the Ollama proxy |

## Other notes

- Swagger UI is available at `/docs` when the deployment runs with `ENV=dev` — the fastest way to
  confirm a payload shape against the actual deployed version instead of trusting this file.
- `inlet()` filters always execute on chat requests; `outlet()` filter behavior has varied by
  release — don't assume post-processing filters always ran.
- File uploads (`/api/v1/files/`) process asynchronously; poll `process/status` before referencing
  the file in a knowledge collection or chat request.

## Sources

- https://github.com/open-webui/docs/blob/main/docs/reference/api-endpoints.md
- https://github.com/open-webui/docs/blob/main/docs/getting-started/advanced-topics/hardening.md
- https://github.com/open-webui/docs/blob/main/docs/features/authentication-access/api-keys.md
- https://whogben.github.io/owui_client/reference/ (community, unofficial — routers: auths, users, groups, models, configs, knowledge, tools)
