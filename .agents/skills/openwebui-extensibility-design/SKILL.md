---
name: openwebui-extensibility-design
description: Choose the Open WebUI mechanism (Function, Tool, Tool Server, or legacy Pipeline) for a new capability, and where its source lives.
---

# Open WebUI Extensibility Design

Use this skill when deciding **how** to add a new capability to Open WebUI — not when calling the API to apply a decision already made. It governs mechanism choice and repo placement; it does not duplicate API mechanics, assistant manifests, or MCP wiring that other `openwebui-*` skills already own.

## Before using this skill

- Read [ai-workspace-control-plane](../ai-workspace-control-plane/SKILL.md) first if the task is broader platform policy, not a single capability decision.
- Confirm the deployed Open WebUI version (`ai-workspace-control-plane` records the pinned baseline). Every claim below was verified against `v0.10.2` source directly — see [references/mechanism-reference.md](references/mechanism-reference.md) for citations. Re-verify after any version bump via [ai-platform-capability-verification](../ai-platform-capability-verification/SKILL.md); do not assume upstream docs (which track latest, not the pin) apply unchanged.

## The five mechanisms

| Mechanism | Who decides to run it | Where it runs | Repo source | Access model |
|---|---|---|---|---|
| **Function — Pipe** | Admin activates it; user selects it like a model | In-process (Open WebUI's own container) | `ai/openwebui/functions/` | Admin-only to author/change its source |
| **Function — Filter** | Runs automatically on every message it's attached to | In-process | `ai/openwebui/functions/` | Admin-only to author/change its source; scope via global flag or per-model `filterIds` |
| **Function — Action** | User clicks a chat UI button | In-process | `ai/openwebui/functions/` | Admin-only to author/change its source; scope via global flag or per-model `actionIds` |
| **Tool** | The model decides mid-conversation (function calling) | In-process | `ai/openwebui/tools/` (create when the first Tool ships — doesn't exist yet) | **Authoring/changing its source needs `workspace.tools` — not admin-only by default.** Owning it (or a write grant) is enough for metadata edits or deletion |
| **Tool Server** (MCP/OpenAPI) | The model decides mid-conversation, same as a Tool | External service, called over HTTP | N/A — it's a connection to an existing service, not source in this repo | Admin-only to register; connection-level group grants (see [openwebui-mcp-tool-integration](../openwebui-mcp-tool-integration/SKILL.md)) |

**Pipelines** (the separate `open-webui/pipelines` worker container) is a sixth, legacy option: superseded by Pipe/Filter Functions for most cases per current upstream docs. See "Pipelines: legacy, avoid by default" below before reaching for it.

## Decision path

1. **Does an existing MCP/OpenAPI server already expose this capability, or should it (shared, reusable, has its own auth/rate-limit story)?** → Tool Server. Stop here, use [openwebui-mcp-tool-integration](../openwebui-mcp-tool-integration/SKILL.md); this is not Function/Tool work.
2. **Should the model decide when to invoke it, with arguments the model fills in?** → Tool, unless authoring/changing its source should stay admin-only (see Trust model below) — then wrap it as a Pipe instead and accept the coarser access model.
3. **Does every message need automatic transformation (redaction, logging, moderation, prompt injection) with no model decision involved?** → Filter. Decide global (every chat) vs scoped (`filterIds` on specific Workspace Models) — default to scoped; only make a Filter global when the behavior must be universal (see [ai-platform-capability-verification](../ai-platform-capability-verification/SKILL.md)'s evidence-over-inference discipline before assuming "global" is required).
4. **Does the user need an explicit chat-UI button to trigger something (re-run, escalate, export)?** → Action, same global/scoped scoping rule as Filter.
5. **Does this need to appear as its own selectable model, or several related ones from one integration** (e.g. a knowledge-sync trigger, a custom-provider bridge, one Pipe exposing multiple sub-models)? → Pipe. A single Pipe module can define a `pipes` attribute/method returning a list to register multiple sub-models (`{pipe_id}.{sub_id}`) — one Function, several models — see [references/mechanism-reference.md](references/mechanism-reference.md) for the exact mechanism. Don't hand-author N near-duplicate Pipe functions when one manifold Pipe covers it.
6. **Is the workload heavy, stateful, or dependency-laden enough that it shouldn't run inside Open WebUI's own container?** → Only now consider Pipelines (see below), or better: a real backend service (this repo already has `erify_api`) fronted by a thin Pipe/Tool that calls it.

## Pipelines: legacy, avoid by default

Current upstream Open WebUI docs describe the separate `open-webui/pipelines` worker as legacy: Pipe Functions replaced its custom-provider/RAG/routing use case, and Filter Functions replaced its message pre/post-processing use case, both in-process and without a companion container to operate. This repo has never deployed a Pipelines service — `ai/openwebui/functions/sync-pipe.py` (a Pipe Function) already does exactly what a Pipeline would have been reached for. Do not stand up a Pipelines worker for a new capability unless the workload is genuinely too heavy/stateful for an in-process Function *and* a real backend service isn't a better fit — get explicit sign-off first, since it adds a new deployed service with its own release-management burden (see [ai-platform-release-management](../ai-platform-release-management/SKILL.md)).

## Trust model

Functions and Tools both execute arbitrary Python inside Open WebUI's own process with no sandboxing (the RCE trust model `ai/openwebui/functions/README.md` already documents for Functions, `CVE-2025-64496`/`GHSA-cm35-v4vp-5xvx`). The axis that matters is **who can author or change the executable source**, not "who can touch the resource at all" — read-only and metadata-only routes are looser on both mechanisms than the source-mutating ones:

- **Functions: every route that creates, mutates, deletes, or toggles a Function's source or admin-configured valves is admin-only** (`get_admin_user`, confirmed in `v0.10.2` source: `create`, `update`, `delete`, `toggle`, `toggle/global`, `valves/update`, `load/url`, `sync`, `export`). Two routes are looser but never touch source: the plain listing (`GET /`) and the three `valves/user/*` routes (a user's own valve preferences) accept any verified user.
- **Tools: creating a Tool, or changing an existing Tool's source, requires `workspace.tools` (or `workspace.tools_import`)** — any verified user holding that permission can author/execute arbitrary server-side Python, not just admins. Metadata-only changes (rename, description, valves, access grants) and deletion are looser: they only require being the Tool's owner, holding a `write` access grant on it, or being admin — `workspace.tools` is not re-checked for those, since they don't `exec()` new code.

Treat granting `workspace.tools` as equivalent to granting Function-source-authoring trust, and gate it the same way through [openwebui-groups-permissions](../openwebui-groups-permissions/SKILL.md) — do not assume "it's just a Tool" is inherently lower-risk than a Function, and do not assume every Tool route needs that same high bar (ownership/write-grant is the correct, narrower check for non-content changes).

## Where source lives in this repo

- Functions: `ai/openwebui/functions/` (established — one Pipe example, `sync-pipe.py`, with its README documenting deployment and gotchas).
- Tools: no Tool exists in this repo yet. When the first one ships, create `ai/openwebui/tools/` following the same pattern as `ai/openwebui/functions/` (git-tracked reviewed source, applied via the Admin API — Tool source also lives in Open WebUI's own DB once deployed, not in Git).
- Tool Servers: nothing to add here — they're connections to services that already have their own source (e.g. `erify_api`'s MCP entrypoint). Policy lives in `ai/mcp/README.md` and `ai/openwebui/tool-access.example.json`.
- Pipelines: out of scope for repo source unless the sign-off in the section above happens; if it does, treat it as a new deployed service under `ai/` following the same version-pin discipline as Open WebUI/LiteLLM.

## Quality gate

- [ ] Mechanism choice matches the decision path above, not "whichever I've used before."
- [ ] If a Tool was chosen, who can create it or change its source (`workspace.tools`) was considered explicitly, distinct from who can own/rename/delete it — not left at whatever the instance default is.
- [ ] If a Filter/Action was chosen, global-vs-scoped was a deliberate choice, not a default.
- [ ] A manifold Pipe (`pipes` attribute) was considered before authoring multiple near-duplicate Pipe functions.
- [ ] Pipelines was not reached for without checking whether a Pipe/Filter Function or a real backend service already covers the need.
- [ ] Capability claims about the deployed instance were verified against the pinned version's source, not assumed from upstream docs — see `references/mechanism-reference.md` for how each fact here was confirmed.
- [ ] New Function/Tool source follows the existing `ai/openwebui/functions/` (or new `ai/openwebui/tools/`) git-tracked-reviewed-copy pattern.

## Related Skills

- [ai-workspace-control-plane](../ai-workspace-control-plane/SKILL.md) — overall platform governance; step 3 of its Open WebUI decision path routes mechanism choice here.
- [openwebui-assistant-adapter](../openwebui-assistant-adapter/SKILL.md) — once a Function/Tool exists, attaching it to a Workspace Model manifest.
- [openwebui-mcp-tool-integration](../openwebui-mcp-tool-integration/SKILL.md) — Tool Server registration mechanics, for when step 1 of the decision path applies.
- [openwebui-groups-permissions](../openwebui-groups-permissions/SKILL.md) — granting `workspace.tools` and other permissions this skill's Trust Model section depends on.
- [openwebui-rest-api](../openwebui-rest-api/SKILL.md) — applying a Function/Tool via the Admin API once written.
- [ai-platform-capability-verification](../ai-platform-capability-verification/SKILL.md) — the source/live-verification method this skill's facts were produced with, and how to re-verify them after a version change.
- [ai-platform-release-management](../ai-platform-release-management/SKILL.md) — version-pin discipline that would apply if a Pipelines worker or any other new service were ever added.
