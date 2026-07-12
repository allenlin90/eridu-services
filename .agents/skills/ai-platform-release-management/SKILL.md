---
name: ai-platform-release-management
description: Manage Open WebUI and LiteLLM version upgrades on the Railway deployment — pinned-but-reviewable image tags, a routine check for new upstream releases, a maintainer-confirmed upgrade gate with breaking-change and downtime risk assessment, and rollback. Use when changing the deployed Open WebUI or LiteLLM image/version, auditing whether the live version matches documented baselines, investigating unexpected platform behavior that might be a version drift, or setting up a recurring version-check routine.
---

# AI Platform Release Management

Open WebUI and LiteLLM run on Railway as container images (`ghcr.io/open-webui/open-webui`, `ghcr.io/berriai/litellm-database`). Neither is under this repo's build pipeline, so verify the deployed image reference and live version directly.

## Core Policy

- **Always pin to an explicit tag.** Never leave `source.image` bare (defaults to `latest`) and never use a moving tag like `main-stable` as the target deployed policy. Open WebUI now satisfies this rule; LiteLLM still uses `main-stable` and must be treated as an open remediation item until an explicit pin is approved and applied.
- **Always set `source.autoUpdates.type` to `disabled`.** Railway's `patch`/`minor` auto-update tiers apply and deploy without review — that reintroduces the same silent-drift problem this policy exists to prevent. There is no Railway-native "notify but don't apply" tier; that gate has to be this skill's routine, not Railway config.
- A pin is a checkpoint, not a freeze. The point is that version changes go through the routine below, not that the version never changes.

## Routine: Check For New Releases

Run this whenever changing deployed-version policy and optionally on a recurring schedule (see [references/procedure.md](references/procedure.md) for exact commands and an opt-in Codex automation pattern). Do not turn every unrelated `ai/` documentation edit into an upstream release audit.

1. Read the deployed image reference from Railway config and the documented baseline in `ai/README.md`. A bare or moving tag is a policy gap even when the observed live version matches the docs; report it before checking upstream.
2. Query the upstream release feed (`open-webui/open-webui`, `BerriAI/litellm`) for releases newer than the pinned or currently observed version.
3. If nothing newer exists, stop — nothing to report.
4. If a newer release exists, produce a maintainer-facing report (template in [references/procedure.md](references/procedure.md)) covering: version delta, breaking changes and migration notes, security fixes included, capability changes that affect this repo's documented assumptions (cross-check `ai/architecture/*.md` and any `SKILL.md` that names a specific version-gated behavior), downtime/blast radius, and a rollback plan.
5. Stop there. Do not apply the version change.

## Maintainer Confirmation Gate

An agent may draft the report and even stage the config patch, but must not execute the Railway mutation that changes `source.image` without an explicit human go-ahead on that specific report. This is a live, shared, staff-facing system — the general repo rule of confirming before affecting shared systems applies here without exception, regardless of how routine the bump looks.

## Downtime And Blast Radius

Both services ran `numReplicas: 1` at the last deployment check. Re-verify replica count before each change; a single-replica service cannot provide a rolling zero-downtime upgrade. Applying a pin change redeploys the service and can briefly interrupt it. Time upgrades for low-traffic windows and state the expected impact in the report.

## After Applying An Upgrade

Re-verify, don't just trust the new pin:

1. Confirm the live version matches what was applied (`GET /api/version` for Open WebUI, `GET /openapi.json` → `info.version` for LiteLLM — see [references/procedure.md](references/procedure.md)).
2. Re-run the same capability checks the version change was justified by (e.g. Native function calling still active, citation behavior, whatever the report's "capability changes" section flagged) — do not assume release notes describe actual behavior on this deployment without checking.
3. Update `ai/README.md`, `ai/architecture/ai-workspace-summary.md`, and any skill that cites a specific deployed version.

## Rollback

Railway keeps deployment history per service. Reverting is repointing `source.image` back to the previous pinned tag and redeploying — the same mechanism as applying the upgrade, in reverse. Confirm this with the maintainer before an upgrade, not while triaging a live incident.

## Related Skills

- [ai-workspace-control-plane](../ai-workspace-control-plane/SKILL.md) — owns overall Open WebUI/LiteLLM/Railway platform policy; this skill covers version-change procedure specifically.
- `use-railway` (installed agent skill) — general Railway CLI/MCP operations; this skill adds the eridu-services-specific pin-and-review policy.
- [openwebui-rest-api](../openwebui-rest-api/SKILL.md) / [litellm-admin-api](../litellm-admin-api/SKILL.md) — used for the post-upgrade capability re-verification.
