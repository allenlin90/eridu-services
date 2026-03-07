# Phase 5: Deferred Features and Future-Scale Work

> **Status**: Deferred / parking lot

## Purpose

Phase 5 is the holding area for features that are valuable but not required to close the P&L-focused priorities in Phase 4.

## Deferred Workstreams

### Cross-Functional Ticketing

- Ad-hoc task creation without templates (show-targeted and client-targeted)
- Cross-functional access for commerce, designers, moderation managers
- Snapshot repurposing for requirement versioning on ad-hoc tasks
- Client self-service ticketing via separate FE app (like erify_creators)

### Material Management

- Material/MaterialType/ShowMaterial data model and CRUD
- Immutable versioning with current-alias pointer
- Material-ticket integration (attachments on ad-hoc tasks)
- Show-material linking and material UI

### Review Quality Hardening

- Admin/manager transition whitelist enforcement
- Required rejection notes
- Review decision audit metadata
- Standardized error responses for invalid transitions

### Collaboration and Communication

- Comments and threaded discussion
- Mentions and notification triggers
- Notification persistence and delivery

### Enterprise / Scale Follow-Ups

- Chunked or append-oriented schedule flows for very large clients
- Advanced bulk review operations after safeguards are proven
- Richer audit/search/reporting surfaces
- Data warehouse (Datastream + BigQuery)
- Formal reopen workflow with approval chain

### MC HR & Operations

- MC HRMS (leaves, unavailability input)
- MC profile/HR separation table (grooming, styling, briefing records)
- Platform API integrations for auto-populating show performance data
- Fixed cost tracking (rent, equipment depreciation)

### Lower-Priority UX Refinements

- Non-essential shift calendar interaction polish
- Workflow enhancements that do not change backend contracts
- Bulk review approve

## Promotion Rule

A Phase 5 item should move into an active phase only when:
- it becomes necessary to ship a current business goal
- it changes a backend contract that Phase 4 already depends on
- it has a clear owner and testable exit criteria
