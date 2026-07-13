# Open WebUI Extensibility Mechanism Reference

Detailed, source-cited backing for the decision table in `SKILL.md`. Every claim below was verified
by reading Open WebUI's own backend source at tag `v0.10.2` (this repo's pinned version per
`ai-workspace-control-plane`), fetched 2026-07-13 via
`https://raw.githubusercontent.com/open-webui/open-webui/v0.10.2/backend/open_webui/<path>`. Treat
this as a snapshot, not a living doc — re-verify with
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

## Function CRUD is admin-only, full stop

`backend/open_webui/routers/functions.py`: every route (`create`, `id/{id}/update`,
`id/{id}/delete`, `id/{id}/toggle`, `id/{id}/toggle/global`, `id/{id}/valves/update`, `sync`,
`load/url`) depends on `get_admin_user`. There is no permission flag that lets a non-admin user create
or edit a Function. This matches and confirms the trust-model note already in
`ai/openwebui/functions/README.md`.

## Tools are not admin-only by default

`backend/open_webui/routers/tools.py`: `create` and `id/{id}/update` depend on `get_verified_user`,
then explicitly check `has_permission(user.id, 'workspace.tools', ...)` (or `workspace.tools_import`)
— an admin always passes, but so does any user granted that permission. Only `load/url` is hard-gated
to `get_admin_user` ("meant for *trusted* internal use", per the source's own comment).

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
granting them Function-authoring-level trust, even though Tools read as the "lighter-weight" mechanism
in upstream docs. Don't grant it by instance default; treat it the same as any other admin-equivalent
grant.

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

Not verifiable from `open-webui/open-webui` source (it's a separate repository,
`open-webui/pipelines`) — this claim is sourced from current official docs content, not a source read,
so hold it more loosely than the source-verified facts above:

- [Tools & Functions (Plugins)](https://docs.openwebui.com/features/extensibility/plugin/)
- [Pipelines](https://docs.openwebui.com/features/extensibility/pipelines/)
- [Pipes](https://docs.openwebui.com/features/extensibility/pipelines/pipes/)

Current docs state Pipelines' custom-provider/RAG/routing use case is superseded by Pipe Functions,
and its message pre/post-processing use case by Filter Functions — both in-process, no companion
worker container required. The docs describe existing Pipelines pages as kept for reference/existing
deployments, not as the recommended path for new work. `docs.openwebui.com` returned HTTP 403 to
direct fetches during this research pass (likely bot-blocking) — the summary above came from search
snippets, not a full page read. Re-confirm by reading the actual pages (browser or a different fetch
path) before making Pipelines-adoption claims stronger than "legacy, avoid by default" in a
maintainer-facing report.
