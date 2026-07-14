# Open WebUI Extensibility Mechanism Reference

Detailed, source-cited backing for the decision table in `SKILL.md`. Most claims below were verified
by reading Open WebUI's own backend/frontend source at tag `v0.10.2` (this repo's pinned version per
`ai-workspace-control-plane`), fetched 2026-07-13 via
`https://raw.githubusercontent.com/open-webui/open-webui/v0.10.2/<path>`. The Pipelines legacy-status
claim (last section) is sourced differently — from the `open-webui/docs` project's own `main` branch,
not the pinned app tag, since Pipelines is documentation/policy content rather than app behavior; that
section says so explicitly. Treat this as a snapshot, not a living doc — re-verify with
[ai-platform-capability-verification](../../ai-platform-capability-verification/SKILL.md) before
trusting a specific line after any version bump, and update the citations here when you do.

## Functions: four types, not three

`backend/open_webui/utils/plugin.py`, `load_function_module_by_id()`, detects the function's type by
which class name is present in the submitted Python source:

```python
if hasattr(module, 'Pipe'):
    return module.Pipe(), 'pipe', frontmatter
elif hasattr(module, 'Filter'):
    return module.Filter(), 'filter', frontmatter
elif hasattr(module, 'Action'):
    return module.Action(), 'action', frontmatter
elif hasattr(module, 'Event'):
    return module.Event(), 'event', frontmatter
else:
    raise Exception('No Function class found in the module')
```

Public docs commonly describe three types (Pipe/Filter/Action). A fourth, `Event`, is real in the
`v0.10.2` loader. Its runtime consumption path was **not located** in this pass (checked
`routers/functions.py`, `functions.py`, `utils/middleware.py` — no branch keys off `type == 'event'`
for a loaded Function; the only `EVENTS`/`publish_event` usage found is an unrelated webhook-lifecycle
system in `events.py` for things like `FUNCTION_CREATED`, and `__event_emitter__`/`__event_call__` are
callback *parameters* passed into Pipe/Filter/Action methods, not the `Event` class type). Treat
`Event` as present-but-unverified-in-practice; do not build on it without a live behavioral check per
`ai-platform-capability-verification`'s live-verification pattern first.

Function DB shape (`backend/open_webui/models/functions.py`, `Function` table): `id`, `user_id`
(creator), `name`, `type`, `content` (Python source), `meta` (description/manifest), `valves`
(admin-configurable config), `is_active`, `is_global`. `is_global=True` means the Function is applied
to every chat automatically — no per-model opt-in needed.

## Function source mutation is admin-only, listing/user-valves are not

`backend/open_webui/routers/functions.py`: every route that creates, changes, deletes, toggles, or
touches admin-configured valves — `create`, `id/{id}/update`, `id/{id}/delete`, `id/{id}/toggle`,
`id/{id}/toggle/global`, `id/{id}/valves/update`, `sync`, `load/url`, `export`, `list`, `id/{id}`
(single-function admin fetch) — depends on `get_admin_user`. There is no permission flag that lets a
non-admin user create or edit a Function's source. This matches and confirms the trust-model note
already in `ai/openwebui/functions/README.md`.

Two routes are the exception, and neither exposes or lets a caller touch a Function's source: the
plain listing endpoint (`GET /`, basic `FunctionResponse` fields only) and the three
`id/{id}/valves/user*` routes (a user's own valve *preferences*, distinct from the admin-configured
`valves` on the Function itself) all depend on `get_verified_user`. Don't characterize Functions as
"every route is admin-only" — characterize it as "every route that can create or change a Function's
source or admin config is admin-only."

## Tool source mutation needs `workspace.tools`; ownership covers the rest

`backend/open_webui/routers/tools.py`, `create`: depends on `get_verified_user`, then explicitly
checks `has_permission(user.id, 'workspace.tools', ...)` (or `workspace.tools_import`) — an admin
always passes, but so does any user granted that permission. Creation always requires it, since
creating a Tool always means `exec()`-ing new source.

`id/{id}/update` is more granular: it first requires the caller be the Tool's owner
(`tools.user_id == user.id`), hold a `write` `AccessGrants` entry on it, or be admin — *then*, only if
`form_data.content != tools.content` (the submitted Python source actually differs from what's
stored), it additionally requires `workspace.tools`/`workspace.tools_import`, exactly as `create`
does. A metadata-only update (rename, description, valves, access grants) by the owner or a
write-grantee does **not** need `workspace.tools` at all.

`id/{id}/delete` requires only the same ownership/write-grant/admin check as update — `workspace.tools`
is never checked for deletion, since deleting doesn't execute code.

Only `load/url` is hard-gated to `get_admin_user` regardless of any permission ("meant for *trusted*
internal use", per the source's own comment) — that's the one Tool route as strict as every Function
route.

**Practical read**: `workspace.tools` is specifically the "can author/execute new Python" gate for
Tools, not a general Tools-CRUD gate. Granting it should be treated as equivalent to granting
Function-authoring trust. Ownership or a write access-grant is the correct, narrower check for
non-content Tool changes — don't require `workspace.tools` for those, and don't assume it's checked
on every Tool route just because it gates creation.

Tool DB shape (`backend/open_webui/models/tools.py`, `Tool` table): `id`, `user_id` (owner), `name`,
`content` (Python source), `specs` (OpenAPI-style function specs derived from the code), `meta`,
`valves`, and `access_grants` (a list of `{principal_type, principal_id, permission}` — the same
per-resource grant shape `openwebui-groups-permissions` documents for other resources). This is a
genuinely different DB table and grant model from Function, and also different from a Tool Server
connection (`configs.tool_servers`, connection-level grants only — see
[openwebui-mcp-tool-integration](../../openwebui-mcp-tool-integration/SKILL.md)). Loading executes
`exec()` on the stored source and instantiates a `Tools` class
(`load_tool_module_by_id()` in `utils/plugin.py`) — the same no-sandbox execution model as Functions.

**Practical consequence**: granting a group or user `workspace.tools` (see the permission table in
[openwebui-groups-permissions](../../openwebui-groups-permissions/SKILL.md)) is equivalent to
granting them Function-source-authoring-level trust, even though Tools read as the "lighter-weight"
mechanism in upstream docs. Don't grant it by instance default; treat it the same as any other
admin-equivalent grant. It is specifically the source-mutation gate, though — see the section above
for which Tool routes it does and doesn't cover.

## Tool Server: admin connection vs. direct/personal (`features.direct_tool_servers`)

`openwebui-groups-permissions` documents `features.direct_tool_servers` as letting "a non-admin user
add their own OpenAPI tool server," which reads like a lighter-weight variant of admin Tool Server
registration. Source shows it's a genuinely different mechanism, not a permission relaxation on the
same one:

- The admin connection list (`backend/open_webui/routers/configs.py`): `GET`/`POST
  /api/v1/configs/tool_servers` and `POST /api/v1/configs/tool_servers/verify` all depend on
  `get_admin_user`, with **no permission flag that relaxes this** — `features.direct_tool_servers`
  does not grant access to these routes. This is the persistent, shared, group-grantable connection
  list `openwebui-mcp-tool-integration` covers, and it supports both `type: "mcp"` and `type:
  "openapi"`.
- The direct/personal path is client-side and per-request, not a registration at all.
  `backend/open_webui/main.py` strips a chat-completion request's `tool_servers` field entirely
  unless the caller is admin or holds `features.direct_tool_servers`
  (`has_permission(user.id, 'features.direct_tool_servers', ...)`, with a comment noting this mirrors
  a matching strip in `user/settings/update`). `backend/open_webui/utils/middleware.py` reads it back
  out of `metadata.get('tool_servers')` as **"Client side tools"** (explicit comment, contrasted with
  `tool_ids` as "Server side tools") and injects each entry's `specs` directly into that one request's
  tool list — nothing is written to the `tool_server` admin config table, no group grant applies, and
  it only affects the chat session that attached it.
- The frontend UI for this (`src/lib/components/chat/ToolServersModal.svelte`) states directly:
  *"Open WebUI can use tools provided by any OpenAPI server"* and links to
  `open-webui/openapi-servers` — **OpenAPI only**. Nothing in this client-attachment code path
  accepts `type: "mcp"`; MCP tool servers only exist through the admin connection list above.

**Practical read**: don't describe `features.direct_tool_servers` as "a non-admin way to register a
Tool Server" without qualifying it — it's a non-admin way to attach *their own OpenAPI server to their
own chat requests*, ephemeral and ungoverned by the group-grant model the admin connection list uses.
An agent choosing between "shared, reusable, needs group access control" (→ admin connection,
`openwebui-mcp-tool-integration`) and "one user's own ad hoc integration, OpenAPI only, no
persistence" (→ `features.direct_tool_servers`, `openwebui-groups-permissions`) needs both paths
named, or it will steer every Tool Server request toward the admin-only path even when a user already
has the lighter-weight option available.

## Pipe manifold: one Function, many models

`backend/open_webui/functions.py`, `get_function_models()`:

```python
# Check if function is a manifold
if hasattr(function_module, 'pipes'):
    sub_pipes = []
    if callable(function_module.pipes):
        if asyncio.iscoroutinefunction(function_module.pipes):
            sub_pipes = await function_module.pipes()
        else:
            sub_pipes = function_module.pipes()
    else:
        sub_pipes = function_module.pipes
    ...
    for p in sub_pipes:
        sub_pipe_id = f'{pipe.id}.{p["id"]}'
```

A Pipe module that defines a `pipes` attribute — a list, or a sync/async method returning a list of
`{"id": ..., "name": ...}` dicts — registers one selectable model per entry, each ID namespaced as
`{function_id}.{sub_id}`. Without a `pipes` attribute, a Pipe registers exactly one model (its own
`id`). Use this before authoring several near-identical single-model Pipes for what's really one
integration surfacing multiple variants (e.g. multiple knowledge collections, multiple upstream model
choices behind one credential).

## Filter/Action scoping: global vs. per-model

`backend/open_webui/utils/models.py`, `get_all_models()`:

```python
global_action_ids = {f.id for f in await Functions.get_global_action_functions()}
enabled_action_ids = {f.id for f in await Functions.get_functions_by_type('action', active_only=True)}
global_filter_ids = {f.id for f in await Functions.get_global_filter_functions()}
enabled_filter_ids = {f.id for f in await Functions.get_functions_by_type('filter', active_only=True)}
```

...and further down, per custom Workspace Model: `meta.actionIds` / `meta.filterIds` on the model's
stored config are read and attached as that model's `action_ids`/`filter_ids`. So a Filter or Action
Function is exposed one of two ways: `is_global=True` (applies to every chat, no model-level wiring
needed) or attached to specific Workspace Models via their `actionIds`/`filterIds` meta fields
(scoped). There is no third state — an active, non-global Filter/Action with no model referencing its
ID in `actionIds`/`filterIds` is active but effectively unreachable. When designing a new Filter/Action,
decide global-vs-scoped deliberately and, if scoped, confirm the target Workspace Model manifest
actually references it (`openwebui-assistant-adapter` owns writing that manifest).

## Workspace Models: preset vs. new selectable model

Still in `get_all_models()`: a custom Model row with `base_model_id is None` is an **override applied
in place** to an existing base model sharing the same ID (renames/reconfigures it, doesn't add a new
selectable entry). A custom Model row with `base_model_id` set to a Pipe-backed base model's ID (or
another model's ID) **adds a new selectable model**, inheriting the base model's `pipe` reference,
`owned_by`, and `connection_type`. This is the mechanism `ai/openwebui/workspace-models.example.json`
manifests compile down to — worth knowing when a manifest isn't showing up as expected (check whether
it's meant to override a base model in place vs. add a net-new one, and whether `base_model_id` is
set correctly).

## Pipelines legacy status

Not verifiable from `open-webui/open-webui` source (Pipelines is a separate repository,
`open-webui/pipelines`, run as its own container). `docs.openwebui.com` itself returned HTTP 403 to
direct fetches during this research pass (likely bot-blocking a non-browser client) — but the docs
*site's own source repository*, `open-webui/docs`, is fetchable directly and isn't blocked, which is
what the claim below is actually sourced from (not search snippets):

`https://raw.githubusercontent.com/open-webui/docs/main/docs/features/extensibility/pipelines/index.mdx`,
top of page, a `:::danger` admonition block:

> **Pipelines are legacy and are no longer recommended.** They predate the in-process Functions
> (Pipes, Filters, Actions) and Tools system, which now covers the same use cases without running a
> separate worker container.
>
> - Custom provider / RAG / request routing (a Pipeline **pipe**) → use a Pipe Function.
> - Message pre/post-processing (a Pipeline **filter**) → use a Filter Function.
> - Connecting an external HTTP service → use an OpenAPI or MCP tool server.
>
> These pages are kept for reference and for existing deployments only. New work should target
> Functions, Tools, or external tool servers instead.

This is the docs project's own current-main content, not a third party's summary of it, so it's solid
evidence for "legacy, avoid by default" as stated in `SKILL.md` — but note it's dated to when this
reference was fetched (2026-07-13) against the docs repo's `main` branch, which is not itself pinned
to Open WebUI app releases the way `v0.10.2` is. Re-fetch this URL (or check for a
`open-webui/pipelines` archival notice) before treating it as still current after a significant time
gap, the same discipline `ai-platform-capability-verification` applies to everything else here.
