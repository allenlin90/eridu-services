---
name: ai-platform-release-management
description: Manage Railway upgrades and rollback for Open WebUI or LiteLLM. Use for version, release, and drift work.
---

# AI Platform Release Management

Open WebUI and LiteLLM run on Railway as container images (`ghcr.io/open-webui/open-webui`, `ghcr.io/berriai/litellm-database`). Neither is under this repo's build pipeline, so verify the deployed image reference and live version directly.

## Core Policy

- **Always pin to an explicit tag.** Never leave `source.image` bare (defaults to `latest`) and never use a moving tag like `main-stable` as the deployed policy, only as a stopgap. An untagged Open WebUI image on this deployment silently drifted two minor versions with zero record of it before anyone noticed — this is not a hypothetical risk. Both Open WebUI and LiteLLM now satisfy this rule.
- **Always set `source.autoUpdates.type` to `disabled`.** Railway's `patch`/`minor` auto-update tiers apply and deploy without review — that reintroduces the same silent-drift problem this policy exists to prevent. There is no Railway-native "notify but don't apply" tier; that gate has to be this skill's routine, not Railway config.
- A pin is a checkpoint, not a freeze. The point is that version changes go through the routine below, not that the version never changes.

## Routine: Check For New Releases

Run this whenever changing deployed-version policy and optionally on a recurring schedule (see [references/procedure.md](references/procedure.md) for exact commands and an opt-in Codex automation pattern). Do not turn every unrelated `ai/` documentation edit into an upstream release audit.

1. Read the deployed image reference from Railway config and the documented baseline in `ai/README.md`. A bare or moving tag is a policy gap even when the observed live version matches the docs; report it before checking upstream.
2. Query the upstream release feed (`open-webui/open-webui`, `BerriAI/litellm`) for releases newer than the pinned or currently observed version.
3. If nothing newer exists, stop — nothing to report.
4. If a newer release exists, produce a maintainer-facing report (template in [references/procedure.md](references/procedure.md)) covering: version delta, breaking changes and migration notes, security fixes included, capability changes that affect this repo's documented assumptions (cross-check `ai/architecture/*.md` and any `SKILL.md` that names a specific version-gated behavior), downtime/blast radius, and a rollback plan.
5. Stage the proposed pin change with `railway environment edit --service-config <service> source.image "<new-tag>" --stage --message "<one-line summary>"` (see [references/procedure.md](references/procedure.md)). `--stage` creates a pending, uncommitted config change — it does not deploy. Attach the report alongside it (as a PR, a chat message, whatever the maintainer will actually see) and stop.

## Maintainer Confirmation Gate

Staging, not a promise not to act, is the actual gate: `--stage` deliberately leaves the change uncommitted, and there is no `railway` CLI or MCP command that commits a staged change — only the Railway dashboard can. An agent literally cannot complete a version bump unilaterally once it stages one; a human has to open the dashboard and apply it. Do not look for or improvise a CLI/API path around this — if one turns out to exist, treat that as a reason to tighten this skill, not a shortcut to take. Confirm this dashboard-only behavior the first time the routine actually runs, per the general "verify against the deployed tool version" rule — Railway's CLI capabilities can change.

## Downtime And Blast Radius

Both services ran `numReplicas: 1` at the last deployment check — re-verify replica count before each change, since a single-replica service cannot provide a rolling zero-downtime upgrade. Applying a pin change redeploys the service and briefly interrupts it — observed ~2 minutes for Open WebUI, but the `litellm-database` image took ~4.5 minutes (likely DB migrations on startup), so don't assume Open WebUI's timing applies to LiteLLM. Time upgrades for low-traffic windows, and say so explicitly in the report rather than assuming the reader knows.

## After Applying An Upgrade

Re-verify, don't just trust the new pin:

1. Confirm the live version matches what was applied (`GET /api/version` for Open WebUI, `GET /openapi.json` → `info.version` for LiteLLM — see [references/procedure.md](references/procedure.md)).
2. Re-run the same capability checks the version change was justified by (e.g. Native function calling still active, citation behavior, whatever the report's "capability changes" section flagged) — do not assume release notes describe actual behavior on this deployment without checking.
3. Update `ai/README.md`, `ai/architecture/ai-workspace-summary.md`, and any skill that cites a specific deployed version.

## Rollback

Railway keeps deployment history per service. Reverting is repointing `source.image` back to the previous pinned tag and redeploying.

The staging gate above is for proactive upgrades — it deliberately trades speed for review. An active incident is the opposite trade: if a maintainer is present and directing the response, apply the revert directly (`railway environment edit --service-config <service> source.image "<previous-tag>"`, no `--stage`) rather than routing it through a dashboard-only commit step. This still needs a human's go-ahead — the rule against acting unilaterally on a live shared system doesn't relax — but it's the maintainer's real-time direction during triage, not an async sign-off on a staged report.

## Related Skills

- [ai-workspace-control-plane](../ai-workspace-control-plane/SKILL.md) — owns overall Open WebUI/LiteLLM/Railway platform policy; this skill covers version-change procedure specifically.
- `use-railway` (installed agent skill) — general Railway CLI/MCP operations; this skill adds the eridu-services-specific pin-and-review policy.
- [openwebui-rest-api](../openwebui-rest-api/SKILL.md) / [litellm-admin-api](../litellm-admin-api/SKILL.md) — used for the post-upgrade capability re-verification.
