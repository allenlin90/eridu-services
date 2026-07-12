---
name: ai-platform-release-management
description: Manage Open WebUI and LiteLLM version upgrades on the Railway deployment — pinned-but-reviewable image tags, a routine check for new upstream releases, a maintainer-confirmed upgrade gate with breaking-change and downtime risk assessment, and rollback. Use when changing the deployed Open WebUI or LiteLLM image/version, auditing whether the live version matches documented baselines, investigating unexpected platform behavior that might be a version drift, or setting up a recurring version-check routine.
---

# AI Platform Release Management

Open WebUI and LiteLLM run on Railway as bare container images (`ghcr.io/open-webui/open-webui`, `ghcr.io/berriai/litellm-database`). Neither is under this repo's build pipeline, so nothing here catches a version change automatically — the only way to know the real running version is to check the deployment directly.

## Core Policy

- **Always pin to an explicit tag.** Never leave `source.image` bare (defaults to `latest`) and never use a moving tag like `main-stable` as the deployed policy, only as a stopgap. An untagged Open WebUI image on this deployment silently drifted two minor versions with zero record of it before anyone noticed — this is not a hypothetical risk.
- **Always set `source.autoUpdates.type` to `disabled`.** Railway's `patch`/`minor` auto-update tiers apply and deploy without review — that reintroduces the same silent-drift problem this policy exists to prevent. There is no Railway-native "notify but don't apply" tier; that gate has to be this skill's routine, not Railway config.
- A pin is a checkpoint, not a freeze. The point is that version changes go through the routine below, not that the version never changes.

## Routine: Check For New Releases

Run this whenever working on `ai/` files under `ai-workspace-control-plane`'s required source check, and optionally on a recurring schedule (see [references/procedure.md](references/procedure.md) for exact commands and a scheduling option via the `schedule` skill — set that up only if asked, don't self-configure a cron job as a side effect of this skill).

1. Read the currently pinned tag from Railway config and the currently documented baseline in `ai/README.md`. If they disagree, that's a drift finding on its own — stop and reconcile before checking upstream.
2. Query the upstream release feed (`open-webui/open-webui`, `BerriAI/litellm`) for releases newer than the pinned tag.
3. If nothing newer exists, stop — nothing to report.
4. If a newer release exists, produce a maintainer-facing report (template in [references/procedure.md](references/procedure.md)) covering: version delta, breaking changes and migration notes, security fixes included, capability changes that affect this repo's documented assumptions (cross-check `ai/architecture/*.md` and any `SKILL.md` that names a specific version-gated behavior), downtime/blast radius, and a rollback plan.
5. Stop there. Do not apply the version change.

## Maintainer Confirmation Gate

An agent may draft the report and even stage the config patch, but must not execute the Railway mutation that changes `source.image` without an explicit human go-ahead on that specific report. This is a live, shared, staff-facing system — the general repo rule of confirming before affecting shared systems applies here without exception, regardless of how routine the bump looks.

## Downtime And Blast Radius

Both services currently run `numReplicas: 1` — there is no rolling/zero-downtime deploy without adding replicas first. Applying a pin change redeploys the service and briefly interrupts it (observed: ~2 minutes from config commit to the new deployment reaching `RUNNING`). Time upgrades for low-traffic windows, and say so explicitly in the report rather than assuming the reader knows.

## After Applying An Upgrade

Re-verify, don't just trust the new pin:

1. Confirm the live version matches what was applied (`GET /api/version` for Open WebUI, `GET /openapi.json` → `info.version` for LiteLLM — see [references/procedure.md](references/procedure.md)).
2. Re-run the same capability checks the version change was justified by (e.g. Native function calling still active, citation behavior, whatever the report's "capability changes" section flagged) — do not assume release notes describe actual behavior on this deployment without checking.
3. Update `ai/README.md`, `ai/architecture/ai-workspace-summary.md`, and any skill that cites a specific deployed version.

## Rollback

Railway keeps deployment history per service. Reverting is repointing `source.image` back to the previous pinned tag and redeploying — the same mechanism as applying the upgrade, in reverse. Confirm this with the maintainer before an upgrade, not while triaging a live incident.

## Related Skills

- [ai-workspace-control-plane](../ai-workspace-control-plane/SKILL.md) — owns overall Open WebUI/LiteLLM/Railway platform policy; this skill covers version-change procedure specifically.
- [use-railway](https://github.com/railwayapp) (user-global skill, not in this repo) — general Railway CLI/MCP operations; this skill only adds the eridu-services-specific pin-and-review policy on top.
- [openwebui-rest-api](../openwebui-rest-api/SKILL.md) / [litellm-admin-api](../litellm-admin-api/SKILL.md) — used for the post-upgrade capability re-verification.
