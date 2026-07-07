---
name: openwebui-groups-permissions
description: Manage Open WebUI user groups, default/group permission sets, and per-resource access grants (models, knowledge, tools/skills) via the API. Use when creating or updating a group, changing workspace/chat/feature permissions, adding or removing users from a group, or deciding which group can use an imported tool, model, or knowledge base.
---

# Open WebUI Groups & Permissions

Task-focused workflow for the "who can access what" side of Open WebUI. Read
[openwebui-rest-api](../openwebui-rest-api/SKILL.md) first for auth setup and general call
mechanics (base URL, GET-before-POST, POST-as-mutate) — this skill assumes that's already known
and only covers the groups/permissions specifics.

## Before using this skill

- This skill executes permission policy; it doesn't set it. Check `ai/openwebui/tool-access.example.json`
  and the group→tool mapping table in `ai/mcp/README.md` for the current declarative policy before
  creating or editing a group.
- Group creation, group updates, and default-permission changes are admin-only. Confirm the calling
  key belongs to an admin user (see the `/api/v1/auths/` smoke test in `openwebui-rest-api`).

## Permission model

Every user has a `UserPermissions` object with four sections, set at the instance-default level and
overridable per group:

| Section | Covers |
|---|---|
| `workspace` | Access to the models/knowledge/prompts/tools workspaces, plus `*_import`/`*_export` sub-permissions for each |
| `sharing` | Can-share and can-make-public toggles for models/knowledge/prompts/tools/notes |
| `chat` | Per-feature chat capabilities: file_upload, stt/tts, call, multiple_models, edit/share/export, temporary chats, etc. |
| `features` | General toggles: `api_keys`, `direct_tool_servers`, `web_search`, `image_generation`, `code_interpreter`, `notes`, `folders`, `channels` |

`features.direct_tool_servers` only lets a non-admin user add their **own OpenAPI** tool server —
it does not grant MCP server registration, which is always admin-only regardless of this permission
(see [openwebui-mcp-tool-integration](../openwebui-mcp-tool-integration/SKILL.md)).

## Group workflow

1. `POST /api/v1/groups/create` — name, description, initial `permissions` object (same four
   sections as above).
2. `POST /api/v1/groups/id/{id}/users/add` / `.../users/remove` — manage membership with a list of
   user IDs.
3. `POST /api/v1/groups/id/{id}/update` — replaces the group's fields including `permissions`; GET
   the current group state before calling this so you don't clobber fields you didn't mean to touch.
4. `POST /api/v1/users/default/permissions` — sets the instance-wide default baseline that applies
   before any group override. Changing this affects every user without an overriding group grant —
   treat it as a higher-blast-radius change than a single group's permissions.

## Resource access grants (models, knowledge, tools)

Open WebUI stores per-resource sharing as normalized grants, not as a field on the group:

- Each grant: `{resource_type: model|knowledge|tool|prompt, resource_id, principal_type: user|group, principal_id, permission: read|write}`.
- `principal_type: user` with `principal_id: "*"` means public/open access.
- To restrict a resource: set its visibility to private/restricted when creating/updating it, then
  grant specific groups or users read/write via that resource's own `.../access/update` endpoint
  (e.g. `POST /api/v1/tools/id/{id}/access/update`). See
  [openwebui-rest-api's endpoint catalog](../openwebui-rest-api/references/endpoints.md) for the
  models/knowledge/tools CRUD paths themselves — this skill only covers the access-control layer on
  top of them.

## Mapping repo policy to API calls

`ai/mcp/README.md` already defines the target group→tool mapping (`operations`, `fulfillment`,
`livestream`, `manager`, `admin`, `staff`) for the erify_api MCP tools. To implement that policy:

1. Create any missing groups first (group workflow step 1).
2. Register the MCP tool server before granting access to it — tools can't be access-granted before
   the server exists (see `openwebui-mcp-tool-integration`).
3. Grant each group read access to the specific tool IDs it's allowed, per the table in
   `ai/mcp/README.md` / `ai/openwebui/tool-access.example.json`.
4. Leave `staff` with no grants (default-deny) rather than an explicit empty grant.

## Quality gate

- [ ] New group or resource starts private/default-deny, not public, unless policy explicitly says otherwise.
- [ ] Group membership and permission changes match `ai/mcp/README.md` / `ai/openwebui/tool-access.example.json`, not an ad hoc decision.
- [ ] `features.direct_tool_servers` not granted to a group that shouldn't be adding its own tool servers.
- [ ] Admin-only endpoints called with an admin key.
- [ ] Default-permission changes (`/api/v1/users/default/permissions`) confirmed with the user before calling — instance-wide blast radius.

## Related Skills

- [openwebui-rest-api](../openwebui-rest-api/SKILL.md) — auth and call mechanics this skill builds on
- [openwebui-mcp-tool-integration](../openwebui-mcp-tool-integration/SKILL.md) — register a tool server before granting groups access to it
- [ai-workspace-control-plane](../ai-workspace-control-plane/SKILL.md) — governs the underlying access policy
- [openwebui-assistant-adapter](../openwebui-assistant-adapter/SKILL.md) — defines each assistant's "allowed groups"
