# Open WebUI Functions

Canonical source for Open WebUI Functions (Pipes/Filters/Actions/Events) applied via the Admin API (`.agents/skills/openwebui-rest-api/SKILL.md`). Function source lives in Open WebUI's own database once deployed, not in Git — these files are the reviewed, git-tracked copy that gets applied through the API, matching the pattern used for `ai/litellm/` and other `ai/openwebui/` policy files.

## `sync-pipe.py`

The knowledge-base Sync Pipe (`ai/architecture/llm-knowledge-base-plan.md`, Sync Contract). Runs inside Open WebUI, triggered by a minimal external event (`POST /api/chat/completions` targeting it as a model), and does the checksum-diff/upload/cleanup work in-process using credentials Open WebUI already holds.

Verified end-to-end against a live disposable test collection on `0.10.2` (Phase 0): create, idempotent no-op on unchanged content, update, create, and obsolete-file removal all confirmed via independent re-reads after each mutation, then fully torn down — nothing was left deployed on production from that verification.

`_source_documents()` now fetches real content from GitHub raw (`raw.githubusercontent.com/{github_owner}/{github_repo}/{github_ref}/...`) for the paths listed in the `content_paths` Valve — a comma-separated explicit file list, not a directory walk. The repo is public, so no token is needed. This is a deliberately small Phase 1 pilot mechanism: it lists files by hand rather than recursively walking `content/`, and it fetches at whatever `github_ref` (default `master`) is configured, so a sync only reflects content that has actually merged. A later phase can replace the explicit list with a recursive GitHub Contents API listing once the corpus outgrows manual maintenance.

**Known constraint, not yet resolved:** the source repo is public. Sensitivity/audience enforcement happens at the Open WebUI knowledge-collection layer (grants), not at the source layer — anyone with the raw GitHub URL can read a `content/` file's text regardless of its `sensitivity` field. This is fine for `public`/`internal` documents (the pilot doc is `internal`, non-sensitive) but is a real gap for `department`/`restricted` content: do not add those to `content/` until this is addressed (make the repo private, split restricted content into a private companion repo, or fetch via an authenticated path). Tracked as a follow-up, not solved by this change.

### Gotchas found during verification (Open WebUI `0.10.2`)

- **`pipe()` must be `async def`, and HTTP calls inside it must use an async client (`httpx.AsyncClient`).** A synchronous `pipe()` using the blocking `requests` library deadlocks the moment it tries to call back into Open WebUI's own API — the blocking call occupies the same event loop thread that would need to handle the nested request, so the self-call hangs until timeout. This isn't a performance nitpick; a sync Pipe calling its own host's API cannot work at all.
- **`GET /api/v1/knowledge/{id}` never populates its `files` field on `0.10.2`**, despite `KnowledgeFilesResponse` being typed to include them — the `Knowledge` SQLAlchemy model has no `files` relationship at all, so this is structurally impossible to fix by retrying or waiting, not a timing issue. Use `GET /api/v1/knowledge/{id}/files` instead (paginated, `items[].filename` + `items[].hash`) to enumerate a collection's actual attached files.

### Deploying it

```
POST /api/v1/functions/create   {id, name, content, meta: {description}}
POST /api/v1/functions/id/{id}/toggle          # is_active defaults to false
POST /api/v1/functions/id/{id}/valves/update   # set api_key, base_url, collection_id, content_paths (github_owner/repo/ref default correctly)
POST /api/chat/completions      {model: "<id>", messages: [{role: "user", content: "sync"}], session_id: "<any-string>"}
```

Unlike the Phase 0 proof-of-concept, this deployment is meant to stay live — it's the real sync mechanism for the Company Wiki collection, not a disposable test. Trigger it manually after merging a `content/` change until Phase 4 automates the trigger.

Function creation and updates are admin-only regardless of the calling user's `direct_tool_servers` permission (that permission only covers OpenAPI tool servers, not Functions). Treat Function-authoring access as admin-equivalent trust — Functions execute arbitrary Python inside the same process as the rest of Open WebUI with no sandboxing (`CVE-2025-64496` / `GHSA-cm35-v4vp-5xvx` is a real RCE via exactly this trust model).
