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
| POST | `/api/v1/knowledge/create` | Create a knowledge base | `workspace.knowledge` (+ `sharing.public_knowledge` for public; otherwise forced private) |
| DELETE | `/api/v1/knowledge/{id}/delete` | Delete a knowledge base | Owner/admin |
| POST | `/api/v1/knowledge/{id}/file/add` | Add an uploaded file to a knowledge collection | |

## Files & retrieval — `/api/v1/files`, `/api/v1/retrieval`

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/files/` | Upload a file for RAG processing |
| GET | `/api/v1/files/{id}/process/status` | Poll processing status — required before the file is usable |
| POST | `/api/v1/retrieval/process/web` | Fetch a URL and store it in a knowledge collection |

## Tools — `/api/v1/tools`

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/tools/create` | Create a tool (ID, name, Python content) |
| POST | `/api/v1/tools/id/{id}/access/update` | Set read/write access grants per user/group |

## Resource access grants (models, knowledge, tools, prompts)

Per-resource sharing is a normalized grant, not a field on the group: `{resource_type, resource_id,
principal_type: user|group, principal_id, permission: read|write}` (`principal_type: user` +
`principal_id: "*"` means public). Each resource type has its own `.../access/update` endpoint (see
`tools/id/{id}/access/update` above); models and knowledge bases follow the same pattern under
their own prefixes. See [openwebui-groups-permissions](../../openwebui-groups-permissions/SKILL.md)
for the workflow that ties groups to these grants.

## Functions — `/api/v1/functions`

The community client exposes a `client.functions` group mirroring the tools CRUD shape
(list/create/update/delete/toggle). Confirm exact paths against the live instance before use —
this catalog only verified `tools`, not `functions`, endpoint-by-endpoint.

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
