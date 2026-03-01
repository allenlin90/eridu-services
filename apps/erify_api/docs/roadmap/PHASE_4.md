# Phase 4: Review Quality, Decision Support, and Controlled Bulk Actions

> **TLDR**: 🗓️ **Planned**. Improves review throughput without weakening review rigor — adds per-task validation summaries, review decision support, standardized error codes, and audit/metrics. Bulk review is gated behind safeguards.

**Status**: ⏳ Planning phase

## Overview

Phase 4 focuses on improving review quality and reviewer throughput without weakening review rigor.

Primary strategy:
- Keep **single-task review** as the default workflow.
- Add stronger validation summaries and review decision support.
- Defer bulk review approvals until safeguards are complete and measurable.

This phase directly addresses the gap identified in Phase 2 follow-up work: review ergonomics at scale while maintaining task-level accountability.

## Related Documentation

- **[Task Management Summary](../TASK_MANAGEMENT_SUMMARY.md)** - Task architecture, workflow policies, and API quick-reference
- **[Task Management UI/UX Summary](../../../erify_studios/docs/TASK_MANAGEMENT_SUMMARY.md)** - Review queue UX and operator/admin interaction patterns
- **[Architecture Overview](../ARCHITECTURE_OVERVIEW.md)** - System architecture and module design

## Core Features

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

### 5. Controlled Bulk Review (Deferred Gate)

Bulk approval is **not** enabled by default in Phase 4.

Bulk review can be introduced only after all safeguards are implemented:
- per-task validation summary pass/fail
- explicit eligibility rules (for example: `REVIEW` only, no validation failures)
- dry-run preview before execution
- partial success reporting with itemized errors
- complete audit trail for each task in a bulk operation

## Implementation Scope

### Backend

- [ ] Add review summary builder in studio task service layer.
- [ ] Expose review summary in studio task detail/list responses (or dedicated summary endpoint).
- [ ] Add standardized review validation error codes.
- [ ] Extend audit metadata and metrics for review actions.
- [ ] Add feature-flagged bulk-action endpoint scaffold (disabled by default).

### Data Contracts

- [ ] Add shared DTO/schema for review summary payload.
- [ ] Add shared DTO/schema for bulk review dry-run and execution result (future-facing, guarded).

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

## Dependencies

- Phase 2 task workflow foundation complete.
- Current studio-scoped action endpoints in place.
- Shared API schema package update path available (`packages/api-types`).

## Rollout Strategy

1. Ship review summary payload + validation hardening.
2. Ship audit/metrics enhancements for review actions.
3. Evaluate reviewer throughput and error rate deltas.
4. Only then evaluate feature-flagged bulk review pilot in selected studios.
