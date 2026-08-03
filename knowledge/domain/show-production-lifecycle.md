# Show Production Lifecycle Domain Model

okf_version: "0.2"
type: domain_concept
status: active
stale_after: "2027-01-01"

## Overview

Core domain model governing livestream Shows in `eridu-services`.

## Lifecycle Transitions

```text
DRAFT → SCHEDULED → PREPARATION → LIVE → COMPLETED
  │          │             │
  └──────────┴─────────────┴──> CANCELLED
```

## Domain Invariants

1. **Host Assignment**: A show in `SCHEDULED` or later state must have a assigned primary Host (Creator) and Room.
2. **Duty Coverage**: Studio Shift schedules must validate creator duty coverage prior to schedule publishing.
3. **Immutable Snapshots**: Task instances generated for a show capture versioned snapshots of Task Templates. Retroactive template changes do not mutate active task snapshots.
4. **Soft Delete**: Shows are soft-deleted via `deletedAt` timestamps. Soft-deleted shows must be excluded from active queries and schedule publishing calculations.
