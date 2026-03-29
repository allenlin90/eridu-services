# Ideation: Creator HR & Operations

> **Status**: Deferred from Phase 4/5 planning
> **Origin**: Phase 4/5 planning, March 2026
> **Related**: [Creator Availability Hardening](../prd/creator-availability-hardening.md), [P&L Revenue Workflow](../prd/pnl-revenue-workflow.md)

## What

Build people-operations and cost-input capabilities: creator HRMS (leaves, unavailability input), creator profile/HR separation (grooming, styling, briefing records), platform API integrations for auto-populating show performance data, and fixed cost tracking (rent, equipment depreciation).

## Why It Was Considered

- Long-term scheduling quality requires accurate unavailability data that is currently entered ad-hoc or maintained outside the system.
- Fixed cost tracking (rent, equipment) is a required input for complete P&L visibility.
- Platform API integrations (TikTok, YouTube, Shopee) would automate show performance data entry and reduce manual input errors.
- Creator profile/HR separation would support professional services records (grooming, styling, briefing) that should not be mixed with operational creator data.

## Why It Was Deferred

1. P&L economics baseline (creator cost + shift cost endpoints) has not shipped yet — fixed cost tracking and full HR inputs are premature before the cost-side foundation is stable.
2. Platform API integrations require platform-specific access tokens and rate limit handling — significant integration scope per platform.
3. Leave/unavailability management needs a product design that aligns with the availability hardening work (see `creator-availability-hardening.md`).
4. Creator profile/HR separation needs schema design to avoid disrupting the existing creator data model.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. P&L economics baseline is shipped and fixed cost tracking is the identified gap in the P&L model.
2. Creator unavailability management is causing scheduling quality issues that manual processes cannot address.
3. Platform API integration is approved and credentials are available for at least one platform.
4. Creator profile/HR separation is required for a compliance or operational reason.

## Implementation Notes (Preserved Context)

### Deferred workstream TODOs

- Creator HRMS (leaves, unavailability input).
- Creator profile/HR separation table (grooming, styling, briefing records).
- Platform API integrations for auto-populating show performance data.
- Fixed cost tracking (rent, equipment depreciation).

### Dependency on P&L economics

Fixed cost tracking is a P&L concern. This item should be sequenced after the economics baseline (`show-economics.md` PRD) ships so the cost model is established before additional cost types are added.
