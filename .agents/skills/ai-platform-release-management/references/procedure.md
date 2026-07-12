# Procedure Reference

## Resolve current context

```bash
railway status --json    # confirms linked project; find the "production" environment id and the
                          # "Open WebUI" / "LiteLLM" service ids under services.edges
railway environment config --json   # services.<service-id>.source.{image,autoUpdates}
```

## Check the actual live version (do not trust the Railway image tag alone — verify behavior)

```bash
curl -s "$OPEN_WEBUI_HOST/api/version"                                   # {"version":"X.Y.Z",...}
curl -s "$LITELLM_HOST/openapi.json" | python3 -c \
  "import json,sys; print(json.load(sys.stdin)['info']['version'])"      # LiteLLM has no /version route
```

## Check upstream for newer releases

```bash
curl -s "https://api.github.com/repos/open-webui/open-webui/releases/latest" | python3 -c \
  "import json,sys; d=json.load(sys.stdin); print(d['tag_name'], d['published_at'])"
curl -s "https://api.github.com/repos/BerriAI/litellm/releases/latest" | python3 -c \
  "import json,sys; d=json.load(sys.stdin); print(d['tag_name'], d['published_at'])"
```

Fetch the specific release body (changelog) for delta analysis:

```bash
curl -s "https://api.github.com/repos/open-webui/open-webui/releases/tags/v0.11.0" | python3 -c \
  "import json,sys; print(json.load(sys.stdin)['body'])"
```

For a multi-version jump, walk each intermediate release rather than diffing only current vs. latest — a breaking change in a skipped minor version is still a breaking change.

## Maintainer report template

```markdown
## Open WebUI / LiteLLM version check — <date>

**Current deployment:** open-webui `0.10.2` (pinned) / litellm `1.91.0` (pinned)
**Latest available:** open-webui `<X>` / litellm `<Y>`

### Breaking changes / migration notes
<from release bodies between current and latest, summarized — link the actual release notes>

### Security fixes included
<CVE/advisory IDs if any>

### Capability changes relevant to this repo
<cross-check ai/architecture/*.md and SKILL.md files that name version-gated behavior —
e.g. "Native function calling", "skill on-demand loading", "Event Functions">

### Downtime / blast radius
<re-verify replica count; describe expected interruption and recommend a low-traffic window when applicable>

### Rollback plan
Repoint `source.image` back to the recorded pre-change image reference, redeploy.

### Recommendation
<upgrade now / wait / needs a staging test first — state why>

### Staged change
<link or reference to the staged Railway config change, once created — see "Stage a proposed pin change" below>
```

## Stage a proposed pin change

Do this as part of the routine, immediately after producing the report — staging is not the confirmation gate, committing is:

```bash
railway environment edit --service-config <service> source.image "<candidate-image>:<candidate-tag>" --stage --message "Propose <service> <old-version> -> <new-version>, see report"
```

`--stage` creates a pending config change; it does not deploy anything. Confirm the response reflects a staged, uncommitted change (not `"committed": true`) before reporting the routine as complete.

## Commit a staged change (maintainer only)

There is no `railway` CLI or MCP command that commits a staged change — it has to happen in the Railway dashboard (Project → Environment → pending changes). If a future CLI/MCP version adds one, treat that as a reason to revisit this skill's gate, not as authorization to use it unattended.

After a maintainer commits the staged change in the dashboard, verify the resulting deployment the same way as any other change:

```bash
railway deployment list --service <service-id> --environment <env-id> --json
```

`SUCCESS` = deployed. For any other state, follow the installed `use-railway` skill and do not claim success on a `DEPLOYING` or `QUEUED` deployment.

## Optional: recurring check via a scheduled agent

If the maintainer wants this checked automatically, create an opt-in Codex automation that runs the "Routine: Check For New Releases" steps and reports findings without applying changes. Do not create recurring infrastructure unless explicitly requested.
