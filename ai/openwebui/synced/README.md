# Open WebUI Live Config Knowledge Base

Pulled directly from the deployed Open WebUI instance via its REST API (admin key, read-only calls per `openwebui-rest-api`/`openwebui-groups-permissions`/`openwebui-mcp-tool-integration` skills). No remote state was changed by the pull itself.

This directory is the durable, git-tracked record of **what's actually configured on the live instance** — design, config, and setup for Open WebUI (and, by extension, the LiteLLM-backed assistants it serves). The example manifests one level up (`workspace-models.example.json`, `tool-access.example.json`) are illustrative templates and had drifted from live reality (live has 9 real assistants across Commerce/Erify/Erisa/Eridu-corporate; the examples show 3 generic ones) — treat this directory, not those templates, as the current source of truth for the live setup.

## Files

| File | Source endpoint | Contents |
|---|---|---|
| `models.json` | `GET /api/v1/models/export` | All 10 Workspace Models (assistants) as configured live, including `skillIds`, `toolIds`, `knowledge`, and `access_grants` (group UUIDs) |
| `groups.json` | `GET /api/v1/groups/` | All 13 groups with full `permissions` objects |
| `tool-servers.json` | `GET /api/v1/configs/tool_servers` | The single registered MCP tool-server connection (`eridu_mcp`) and its group access grants |
| `default-permissions.json` | `GET /api/v1/users/default/permissions` | Instance-wide default `UserPermissions` baseline |
| `skills/*.md` | `GET /api/v1/skills/export` | Full content of all 19 Open WebUI Skills (the "Eridu Brain"), one file per skill ID, verbatim including YAML frontmatter |
| `knowledge.json` | `GET /api/v1/knowledge/{id}` | The live "Company Wiki" knowledge collection (Phase 1 pilot) — `access_grants` (12: `Org - General` + all 11 pillar/finance/hr groups, all `read`). `files` is `null` here by design — that endpoint never populates it on `0.10.2` (see `ai/openwebui/functions/README.md` gotchas); see `knowledge-files.json` for the real file listing. |
| `knowledge-files.json` | `GET /api/v1/knowledge/{id}/files` | Actual files attached to the Company Wiki collection — currently 2 (`shared.company-wiki-overview.md`, `shared.governance-ops.md`; each keyed by the document's frontmatter `id`, not its repo path). |
| `functions.json` | `GET /api/v1/functions/id/{id}` + `.../valves` | The deployed `company_wiki_sync` Sync Pipe Function's metadata, active state, and valves (`api_key` redacted — see `ai/openwebui/.env`). Source content itself is not duplicated here; canonical source is `ai/openwebui/functions/sync-pipe.py`, applied via the deploy steps in `ai/openwebui/functions/README.md`. |

## Groups roster (id → name)

| Group ID | Name |
|---|---|
| `7b35c753-4d87-46c3-896c-d43fb188da9f` | Commerce - Manager |
| `8a37f184-4ac5-4226-9852-50b88029b181` | Erify - Member |
| `5ce9a10e-6161-41d7-9fbe-24cfd6d5cb85` | Commerce - Team-Lead |
| `06a13d90-8f63-40ac-9371-b202eefd1f22` | Erify - Team-Lead |
| `4c0e8df2-0dc7-44ef-a7ed-a7abae84956f` | Erify - Manager |
| `b62ac290-77f4-4eef-921d-b5f4341f7528` | Finance - Manager |
| `072d90e6-b38c-4a75-ac28-ef7c69a7535c` | HR - Manager |
| `4fb7717c-fb34-44ee-bf67-a14033664ec8` | Erisa - Team-Lead |
| `02ec2465-b5f3-4e9f-93b5-ca87b46f0936` | Erisa - Member |
| `d29a3ec1-ab9c-4544-8a87-1a21fc0dfd81` | Erisa - Manager |
| `fdfc0f31-8adf-4fa3-8d69-e907c5541894` | Commerce - Member |
| `3728dd04-6c44-41d0-9836-49c70593af45` | Org - General |
| `17e06578-d8e0-4134-81e3-a859c5f158b1` | Admins |

## Assistants (Workspace Models) roster

| Assistant ID | Display name | Skill IDs | Groups granted access |
|---|---|---|---|
| `production-assistant` | Erify - Production Assistant | core-principles, content-management, governance-ops | Erify - Team-Lead, Admins, Org - General, Erify - Manager, Erify - Member |
| `management-assistant` | Eridu - Finance Assistant | core-principles, org-chart, financial-guardrails, finance-ops, governance-ops | 061b2897-f788-4ff7-b42a-dd05fbe9f137, Admins, Org - General, 39cc7eb7-37ab-4f75-add7-113e97b88fa0, Finance - Manager |
| `performance-assistant` | Erify - Performance Assistant | core-principles, 0002, content-management, governance-ops | Erify - Team-Lead, Admins, Org - General, Erify - Manager, Erify - Member |
| `commerce-assistant` | Commerce - Operations Assistant | core-principles, commerce, governance-ops | Admins, Org - General, Commerce - Team-Lead, Commerce - Manager, Commerce - Member |
| `eridu-hr-assistant` | Eridu - HR Assistant | core-principles, org-chart, talent-development-framework, governance-ops | HR - Manager, Admins, Org - General |
| `scheduling-assistant` | Erify - Scheduling Assistant | core-principles, content-management, governance-ops | Erify - Team-Lead, Admins, Org - General, Erify - Manager, Erify - Member |
| `erisa-adp-assistant` | Erisa - ADP Assistant | core-principles, creator-management, affiliate-management-, governance-ops | Erisa - Member, Admins, Org - General, Erisa - Team-Lead, Erisa - Manager |
| `creator-service-assistant` | Erisa - Creator Service Assistant | core-principles, creator-management, governance-ops | Erisa - Member, Admins, Org - General, Erisa - Team-Lead, Erisa - Manager |
| `commerce-sales-assistant` | Commerce - Sales Assistant | core-principles, governance-ops, commerce, sales | Admins, Org - General, Commerce - Team-Lead, Commerce - Manager, Commerce - Member |
| `eridu-brain` | Eridu Brain | org-chart, 00010, sales, legal-process, hr-ops, governance-ops, financial-guardrails, finance-ops, 0002, decisionlog, creator-management, core-principles, content-management, commerce, talent-development-framework, openwebui-litellm-railway-integration-guide, affiliate-management- | Admins, Org - General |
| `eridu-general` | Eridu General | (none) | public (`principal_type: user`, `principal_id: "*"`) — pre-existing, unrelated to the wiki work, not investigated further |
| `company-wiki-pilot` | Company Wiki (Pilot) | citation-escalation-contract | none yet — private to the creating admin. Phase 2 pilot: knowledge attached is the real "Company Wiki" collection; base model `MiniMax-M3` (the `company-*` LiteLLM aliases referenced elsewhere in this repo's skills do not exist live — verified via `GET /v1/models` on LiteLLM, only raw provider/model names exist). Widening access is a pending decision, not yet made. **Recreated once** after a real bug: the first version's knowledge entry was missing `type: "collection"`, causing every question to falsely report "no documents were available" — see known-gaps below. |

## Notes for cross-checking `../skills-import-test-plan.md`

- All assistant IDs referenced in the test plan (`commerce-assistant`, `commerce-sales-assistant`, `performance-assistant`, `production-assistant`, `scheduling-assistant`, `erisa-adp-assistant`) exist live and match this roster.
- The org is three pillars — **Commerce**, **Erify**, **Erisa** — each with Manager/Team-Lead/Member groups, plus cross-cutting `Finance - Manager`, `HR - Manager`, `Org - General`, and `Admins`. This matches the test plan's "Business Unit Managers" framing.
- `ai/openwebui/README.md`, `workspace-models.example.json`, and `tool-access.example.json` describe a *generic* 3-assistant example and do not yet reflect this live 9-assistant / 3-pillar structure — treat those as stale templates until someone folds this real structure back into canonical docs (a decision for the user, not made here).

## Known live-config gaps (found during review)

These are discrepancies in the **live** Open WebUI/MCP config itself, observed while building this knowledge base. Flagging so they're not silently hidden behind "this is the source of truth now."

- **Resolved.** `tool-servers.json`'s `eridu_mcp` connection previously had an empty `function_name_filter_list` and was access-granted to all 13 groups. Narrowed to 9 groups (`Admins`, `Org - General`, all three `*-Manager`/`*-Team-Lead` pairs across Commerce/Erify/Erisa, plus `Erify - Member`), excluding `Commerce - Member`, `Erisa - Member`, `Finance - Manager`, and `HR - Manager`. This is a single connection-level grant, not per-tool filtering — the target list didn't need disjoint tool subsets per group, so `openwebui-mcp-tool-integration`'s filtered-connection-splitting pattern wasn't needed here. `auth_type` is still `none` — the server itself has no caller authentication yet; that's tracked separately as a real feature (reuse the `eridu_auth` SSO Open WebUI already trusts), not bundled into this grant fix.
- **Resolved.** `models.json`'s `Eridu CMD` knowledge collection previously had a wildcard grant (`principal_type: user`, `principal_id: "*"`) despite carrying live finance-sensitive content (cash position, approval tiers). Narrowed to `Admins` + `Finance - Manager` only — explicitly provisional pending the audience/sensitivity classification work these docs still owe the collection's actual contents.
- **Still open.** `models.json`: the `management-assistant` (Eridu - Finance Assistant) has `access_grants` referencing two group IDs (`39cc7eb7-37ab-4f75-add7-113e97b88fa0`, `061b2897-f788-4ff7-b42a-dd05fbe9f137`) that don't exist in the current `groups.json` — orphaned grants, most likely from groups that were since renamed or deleted (the live roster only has `Finance - Manager`, `Admins`, and `Org - General` as real finance-relevant groups). Harmless today (grants to a nonexistent principal just don't resolve to anyone), but if a Finance team-lead/member role is supposed to have access, it isn't currently getting it and needs a fresh grant to a real group.
- **Resolved.** First live deployment of the Sync Pipe (Phase 1, not the Phase 0 disposable test) hit two real bugs while syncing the first real document: (1) triggering with `collection_id` unset in Valves created a new "Company Wiki" collection on every call, not just the first — a stray duplicate collection and its file were created and deleted during setup; (2) existing-file matching used the repo-relative path, but Open WebUI flattens uploaded filenames to their basename, so re-sync couldn't recognize the existing file and got a `400: Duplicate content detected` on retry — one orphaned failed-upload file object was created and deleted during setup. Both fixed in `ai/openwebui/functions/sync-pipe.py` (match by frontmatter `id`, not path) and `collection_id` is now pinned in the live valves. See `ai/openwebui/functions/README.md` gotchas for detail.
- **Still open.** The `company-fast`/`company-balanced`/`company-reasoning`/`company-coding` LiteLLM alias convention documented in `ai-workspace-control-plane` and `openwebui-assistant-adapter` was never actually created — confirmed via `GET /v1/models` on live LiteLLM (`1.91.0`), which returns only raw provider/model names (`MiniMax-M3`, `gemini/*`, `groq/*`, etc.), no `company-*` entries. All 10 pre-existing assistants, and the new `company-wiki-pilot`, use `MiniMax-M3` directly as a result. Referencing a `company-*` alias in a new assistant today would fail with a model-not-found error, not just violate convention.
- **Resolved, but a real platform bug.** `company-wiki-pilot`'s first version had a knowledge attachment that silently never worked — every question returned a well-formatted but *false* "no documents were available" escalation. Root cause: its `meta.knowledge[]` entry, built from `GET /api/v1/knowledge/{id}`'s raw response, had no `type` field; Open WebUI's builtin retrieval tools skip any knowledge entry without `type: "collection"`. Fixed by adding it and recreating the model. Found via the actual chat UI, not the API — see `.agents/skills/openwebui-rest-api/references/endpoints.md` for the full gotcha and the source citation.
- **Separate platform bug, not caused by this project.** `POST /api/v1/models/model/update` returns a bare `500 Internal Server Error` for any payload on this instance (`0.10.2`), confirmed against a fresh disposable model with a trivial body — not specific to `company-wiki-pilot`'s payload. Workaround: delete + recreate via `/create` instead of updating in place. Worth a bug report upstream; not investigated further here.
- **Skill id `affiliate-management-` carries a trailing hyphen** (and its display name `Affiliate management ` a trailing space) at the source. `erisa-adp-assistant` and `eridu-brain` both reference the id exactly as `affiliate-management-`, so the synced file is named `skills/affiliate-management-.md` to match byte-for-byte — don't "clean up" the filename without also fixing the id in Open WebUI, or the assistant's `skillIds` reference breaks.

## Handling
- **Committed to git as the design/config/setup knowledge base for Open WebUI + LiteLLM.** This includes live internal group UUIDs and the full text of company operating docs (finance guardrails, HR policy, sales playbook, etc.) pulled from the "Eridu Brain" skills — kept intentionally, by decision, rather than redacted or excluded.
- This is a **point-in-time pull, not a live sync.** Re-run the same read-only API calls (see `openwebui-rest-api`, `openwebui-groups-permissions`, `openwebui-mcp-tool-integration` skills) and overwrite these files whenever live config changes materially (new/changed assistant, group, tool-server connection, or skill content) so this knowledge base doesn't silently go stale.
