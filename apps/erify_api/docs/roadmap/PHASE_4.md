# Phase 4: Review Quality, Decision Support, and Controlled Bulk Actions

> **TLDR**: 🗓️ **Planned**. Improves review throughput without weakening review rigor — adds per-task validation summaries, review decision support, standardized error codes, and audit/metrics. Establishes a BigQuery data warehouse via Datastream CDC for operational analytics and BI. Bulk review is gated behind safeguards.

**Status**: ⏳ Planning phase

## Overview

Phase 4 focuses on improving review quality and reviewer throughput without weakening review rigor. It also establishes the operational data warehouse (Datastream + BigQuery) to power analytics, BI dashboards, and data-driven decision support across all domains.

Primary strategy:
- Keep **single-task review** as the default workflow.
- Add stronger validation summaries and review decision support.
- Defer bulk review approvals until safeguards are complete and measurable.
- Establish a BigQuery data warehouse via Datastream CDC for operational analytics and BI.

This phase directly addresses the gap identified in Phase 2 follow-up work: review ergonomics at scale while maintaining task-level accountability.

## Related Documentation

- **[Task Management Summary](../TASK_MANAGEMENT_SUMMARY.md)** - Task architecture, workflow policies, and API quick-reference
- **[Task Management UI/UX Summary](../../../erify_studios/docs/TASK_MANAGEMENT_SUMMARY.md)** - Review queue UX and operator/admin interaction patterns
- **[Architecture Overview](../ARCHITECTURE_OVERVIEW.md)** - System architecture and module design

## Core Features

### 0. Prerequisites (Remaining Gaps from Phase 2)

Action-based endpoints and operator state machine are already implemented (see Phase 2 Deferred Work). The following gaps remain:

- **Admin/Manager Transition Enforcement**: The studio `PATCH /studios/:studioId/tasks/:id/action` endpoint resolves action → status with no "from → to" whitelist — admins can freely transition to any status. Add a transition allowlist: `REVIEW→COMPLETED`, `REVIEW→IN_PROGRESS`, `any→BLOCKED`, `any→CLOSED`.
- **Frontend: Admin Review Queue**: A dedicated review queue UI with `?status=REVIEW` filter and rejection notes surfaced to operators.

### 1. High-Fidelity Single-Task Review (Default Path)

- Preserve task-by-task review and approval as the canonical admin workflow.
- Ensure each approval decision is made with explicit context:
  - checklist completion state
  - required-field validation status
  - blocker/rejection context
  - due/overdue context

### 2. Review Summary API (Per Task)

- Add structured review summary payload for studio-scoped review actions.
- Summary should support a deterministic "can approve" decision.

Example summary fields:
- `is_schema_valid`
- `required_total`
- `required_completed`
- `missing_required_keys[]`
- `has_blocked_reason`
- `has_rejection_note`
- `is_overdue`
- `can_approve`

### 3. Validation & Error Code Hardening

- Standardize review-related error codes for studio actions.
- Add explicit rejection reasons for:
  - invalid transition
  - missing required review context
  - schema/content mismatch

### 4. Audit and Observability for Review Actions

- Improve audit metadata for review outcomes:
  - actor identity and role
  - action intent
  - validation snapshot at decision time
- Add metrics for review throughput and rejection patterns.

### 4.1 Studio Shift Calendar Interactivity (Deferred from Phase 3)

- Add interactive calendar events for shift schedule surfaces:
  - Admin: click event to open shift edit flow (dialog or table-row focus).
  - Member: click event to open read-only shift detail popover.
- Keep this as a UX enhancement phase after Phase 3 core shift operations stabilize.

### 5. Operational Data Warehouse (Datastream + BigQuery)

- **Datastream CDC**: Stream PostgreSQL change data capture (CDC) to BigQuery in near-real-time. Zero code changes in erify_api — reads directly from the DB replication stream.
- **BigQuery Dataset**: Full operational data replicated — shows, schedules, tasks, materials, shifts, memberships. Enables ad-hoc SQL, historical trend analysis, and cross-studio comparisons.
- **BI Layer**: Dashboards via Looker, Metabase, or equivalent for:
  - Review throughput and rejection patterns (supports Phase 4 review quality goals)
  - Task completion rates, operator performance, bottleneck identification
  - Show scheduling efficiency, studio utilization
  - Shift cost analysis and billing insights (consumes Phase 3 shift data)
- **Replaces**: In-app `TaskAnalyticsSnapshot` model and Recharts dashboard (see superseded [Analytics Dashboard Design](../design/ANALYTICS_DASHBOARD.md)). All analytics served from BigQuery, not the application database.

### 6. Controlled Bulk Review (Deferred Gate)

Bulk approval is **not** enabled by default in Phase 4.

Bulk review can be introduced only after all safeguards are implemented:
- per-task validation summary pass/fail
- explicit eligibility rules (for example: `REVIEW` only, no validation failures)
- dry-run preview before execution
- partial success reporting with itemized errors
- complete audit trail for each task in a bulk operation

## Implementation Scope

### Prerequisites (remaining gaps from Phase 2)

- [ ] Add transition whitelist in `StudioTaskController.runTaskAction()` / studio task service layer
- [ ] Frontend: Admin review queue UI with `?status=REVIEW` filter + rejection notes

### Backend

- [ ] Add review summary builder in studio task service layer.
- [ ] Expose review summary in studio task detail/list responses (or dedicated summary endpoint).
- [ ] Add standardized review validation error codes.
- [ ] Extend audit metadata and metrics for review actions.
- [ ] Add feature-flagged bulk-action endpoint scaffold (disabled by default).

### Data Contracts

- [ ] Add shared DTO/schema for review summary payload.
- [ ] Add shared DTO/schema for bulk review dry-run and execution result (future-facing, guarded).

### Data Warehouse

- [ ] Write [Data Warehouse Design Doc](../design/DATA_WAREHOUSE_DESIGN.md) (Datastream + BigQuery architecture)
- [ ] Provision Datastream job (PostgreSQL → BigQuery CDC)
- [ ] Configure BigQuery dataset, table schemas, and partitioning
- [ ] Set up BI dashboards (review metrics, task analytics, operational KPIs)

### Documentation

- [ ] Update task management design doc with review-summary contract and decision rules.
- [ ] Update API examples for review transitions and error responses.

## Non-Goals

- Replacing single-task review with one-click bulk approval.
- Auto-approving tasks purely from status transitions.
- Enabling unrestricted bulk review without validation/audit safeguards.

## Success Criteria

- [ ] Studio admins can review each task faster without loss of review quality.
- [ ] Review decisions are explainable and reproducible from API data.
- [ ] Invalid approvals are blocked with explicit, standardized error responses.
- [ ] Bulk review remains gated until safeguard checklist is complete.
- [ ] Datastream CDC replicates operational data to BigQuery in near-real-time.
- [ ] BI dashboards serve review metrics and operational KPIs from BigQuery.

## Dependencies

- Phase 2 task workflow foundation complete.
- Phase 3 data (materials, shifts) available for comprehensive analytics.
- Current studio-scoped action endpoints in place.
- Shared API schema package update path available (`packages/api-types`).
- GCP project with Datastream and BigQuery APIs enabled.

## Rollout Strategy

1. Ship admin/manager transition whitelist + frontend review queue UI (remaining Phase 2 gaps).
2. Ship review summary payload + validation hardening.
3. Ship audit/metrics enhancements for review actions.
4. Provision Datastream + BigQuery pipeline, deploy BI dashboards.
5. Evaluate reviewer throughput and error rate deltas (now powered by BigQuery).
6. Only then evaluate feature-flagged bulk review pilot in selected studios.
