# Known Gaps Found By This Process (Open WebUI `0.10.2`)

Concrete instances where the pattern in `SKILL.md` caught something a naive read/test would have missed. Kept as evidence for the technique, not a changelog — update or remove an entry if a future Open WebUI version fixes it, rather than narrating that it changed.

## Response fields typed but never populated

`GET /api/v1/knowledge/{id}` is typed to return `files: Optional[list[FileMetadataResponse]]`, but the handler builds its response from `Knowledges.get_knowledge_by_id`, which returns a plain `KnowledgeModel` with no `files` attribute at all — and the underlying `Knowledge` SQLAlchemy table has no `files` relationship defined. The field is structurally `None` on every call, regardless of how many files are actually attached. Confirmed both from source (no relationship exists to populate it) and live (a collection with a freshly-added, fully-processed file still returned `files: null`).

Fix: use the dedicated `GET /api/v1/knowledge/{id}/files` endpoint instead, which correctly returns `items: [{filename, hash, ...}]`.

Lesson: a typed response field is a claim about intent, not a guarantee the handler fulfills it. Verify a field is actually populated with a live call before depending on it, not just from the Pydantic model.

## Two similar endpoints, different path shape

`POST /api/v1/tools/id/{id}/access/update` (note the `id/` segment) vs `POST /api/v1/knowledge/{id}/access/update` (no `id/` segment). Guessing one from the other by analogy would 404. Confirmed by reading each router's actual route decorator, not by pattern-matching.

## Request fields must be top-level, not nested under `metadata`

The public `POST /api/chat/completions` handler builds its internal `metadata` dict by popping `session_id`, `chat_id`, etc. directly off the top level of the request body (`form_data.pop('session_id', None)`), not from a client-supplied `metadata: {...}` object. Sending `{"metadata": {"session_id": "..."}}` is silently ignored — no error, just `session_id: None` internally, which in turn made `use_builtin_tools` evaluate `False` and produced completely different (and, out of context, plausible-looking) behavior: skills got fully injected instead of loaded on demand, until the request shape was corrected to `{"session_id": "...", ...}` at the top level.

Lesson: a request that "works" (200, plausible response) is not proof the request shape was right — it may have silently taken a different code branch than intended.

## Two genuinely different retrieval code paths

Passing `files: [{type: "collection", id}]` directly in a chat completion request and having an assistant with that collection *attached* both "work," but go through different code — direct `files` injection vs. Native-function-calling's `query_knowledge_files` tool call. A citation-correctness finding on one path does not transfer to the other; each needs its own verification. Confirmed for the direct-injection path (see `llm-knowledge-base-plan.md`, Citation And Escalation Contract); the assistant-attachment path remains unverified as of this writing.

## Baseline overhead can look like the thing you're testing

When `use_builtin_tools` is active (a valid `session_id` present), Open WebUI includes the full set of ~25+ builtin tool schemas (memory, notes, channels, knowledge, skills, task management, etc.) in every request — roughly 4500 tokens of fixed overhead on the tested setup, entirely unrelated to whatever specific capability was being tested. A first attempt at measuring "does attaching a large skill add ~6000 tokens" without an explicit no-skill control could easily misattribute this fixed overhead to the skill. Always run the zero-candidate control in the same session/request shape before interpreting a token delta.
