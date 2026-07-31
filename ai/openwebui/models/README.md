# Workspace Model Manifests

One file per Open WebUI Workspace Model (assistant). **These files are the source of truth** —
`ai/openwebui/synced/models.json` is a snapshot of the live instance, used to detect drift, not to
edit.

Apply with [`../push_config.py`](../push_config.py); design decisions live in
[`openwebui-assistant-adapter`](../../../.agents/skills/openwebui-assistant-adapter/SKILL.md).

```bash
python3 ai/openwebui/push_config.py models            # dry run
python3 ai/openwebui/push_config.py models --apply    # write
```

## Shape

```jsonc
{
  "id": "commerce-assistant",          // must equal the filename stem
  "name": "Commerce - Operations Assistant",
  "base_model_id": "MiniMax-M3",       // a real live LiteLLM model id
  "is_active": true,
  "description": "Assistant for the Commerce Operations team",
  "system": null,                      // system prompt, or null
  "params": {},                        // temperature etc.; `system` is kept out of here
  "capabilities": { "citations": true, "web_search": false },
  "builtin_tools": { "code_interpreter": false, "image_generation": false },
  "skill_ids": ["core-principles", "commerce"],
  "tool_ids": ["server:mcp:eridu_mcp"],
  "knowledge": [                       // references only, hydrated at apply time
    { "id": "0f0de3c0-...", "type": "collection", "name": "Company Wiki" }
  ],
  "access": {
    "public": false,
    "write_groups": ["Admins"],        // write implies read
    "read_groups": ["Commerce - Operation"]
  }
}
```

## Rules

- **Groups are names, not UUIDs.** They resolve against the live group list at apply time. A name
  that does not exist live is a hard error, not a silent skip — group UUIDs are unreadable in a diff
  and a stale one is invisible.
- **`skill_ids` are byte-exact live ids**, matching a filename stem in `../skills/`. Some carry
  oddities (`affiliate-management-`); do not tidy them.
- **`knowledge` holds references only.** The full objects embed cached access grants that go stale
  and, for Full-Context files, the entire file text. `push_config.py` re-fetches collections at
  apply time and sets the `type` field Open WebUI's retrieval silently requires.
- **A Full-Context `type: "file"` attachment cannot be reconstructed from the API.** It exists only
  inside the model object, so it must already be attached live; re-attach it in the UI and re-run
  `pull_config.py` if it is ever lost.
- **This file decides skill access.** A group that can read a model gets read on every skill the
  model binds — that derivation is the *only* path to a skill. See
  [`openwebui-groups-permissions`](../../../.agents/skills/openwebui-groups-permissions/SKILL.md).
- **Applied via `POST /api/v1/models/import`**, not `/model/update`, which returns a bare `500` on
  this instance.

## Adding a model

1. Create `<id>.json` here.
2. `python3 ai/openwebui/push_config.py models --only <id>` and read the diff.
3. `... --apply`, then `python3 ai/openwebui/push_config.py access --apply` to grant its skills.
4. `python3 ai/openwebui/pull_config.py` and commit `synced/` in the same change.
