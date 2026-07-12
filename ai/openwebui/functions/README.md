# Open WebUI Functions

Canonical source for Open WebUI Functions (Pipes/Filters/Actions/Events) applied via the Admin API (`.agents/skills/openwebui-rest-api/SKILL.md`). Function source lives in Open WebUI's own database once deployed, not in Git — these files are the reviewed, git-tracked copy that gets applied through the API, matching the pattern used for `ai/litellm/` and other `ai/openwebui/` policy files.

## `sync-pipe.py`

The knowledge-base Sync Pipe (`ai/architecture/llm-knowledge-base-plan.md`, Sync Contract). Runs inside Open WebUI, triggered by a minimal external event (`POST /api/chat/completions` targeting it as a model), and does the checksum-diff/upload/cleanup work in-process using credentials Open WebUI already holds.

Verified end-to-end against a live disposable test collection on `0.10.2` (Phase 0): create, idempotent no-op on unchanged content, update, create, and obsolete-file removal all confirmed via independent re-reads after each mutation, then fully torn down — nothing was left deployed on production from that verification.

`_source_documents()` is a hardcoded placeholder pair for the proof-of-concept. Phase 1 replaces that one method with a real fetch (e.g. the GitHub Contents API) against `ai/openwebui/knowledge/company-wiki/content/` — everything else (diffing, upload, cleanup, error reporting) carries over unchanged.

### Gotchas found during verification (Open WebUI `0.10.2`)

- **`pipe()` must be `async def`, and HTTP calls inside it must use an async client (`httpx.AsyncClient`).** A synchronous `pipe()` using the blocking `requests` library deadlocks the moment it tries to call back into Open WebUI's own API — the blocking call occupies the same event loop thread that would need to handle the nested request, so the self-call hangs until timeout. This isn't a performance nitpick; a sync Pipe calling its own host's API cannot work at all.
- **`GET /api/v1/knowledge/{id}` never populates its `files` field on `0.10.2`**, despite `KnowledgeFilesResponse` being typed to include them — the `Knowledge` SQLAlchemy model has no `files` relationship at all, so this is structurally impossible to fix by retrying or waiting, not a timing issue. Use `GET /api/v1/knowledge/{id}/files` instead (paginated, `items[].filename` + `items[].hash`) to enumerate a collection's actual attached files.

### Deploying it

```
POST /api/v1/functions/create   {id, name, content, meta: {description}}
POST /api/v1/functions/id/{id}/toggle          # is_active defaults to false
POST /api/v1/functions/id/{id}/valves/update   # set api_key, base_url, collection_id
POST /api/chat/completions      {model: "<id>", messages: [{role: "user", content: "sync"}]}
```

Function creation and updates are admin-only regardless of the calling user's `direct_tool_servers` permission (that permission only covers OpenAPI tool servers, not Functions). Treat Function-authoring access as admin-equivalent trust — Functions execute arbitrary Python inside the same process as the rest of Open WebUI with no sandboxing (`CVE-2025-64496` / `GHSA-cm35-v4vp-5xvx` is a real RCE via exactly this trust model).
