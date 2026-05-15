# Phase 4 — Backend Authorization Matrix

> **Owner app**: `apps/erify_api`
> **Phase doc**: [docs/roadmap/PHASE_4.md](../../../docs/roadmap/PHASE_4.md) — workstream tracker, PR roadmap, architecture guardrails, doc flow, DoD, verification gates.
> **Auth foundation**: [AUTHORIZATION_GUIDE.md](./design/AUTHORIZATION_GUIDE.md) — role system, guards, permission model.

This file is the Phase-4 endpoint→role matrix. Everything else (architecture guardrails, per-feature design index, verification gates) lives in [PHASE_4.md](../../../docs/roadmap/PHASE_4.md).

## Authorization Matrix

| Endpoint group                                | Required roles                                  |
| --------------------------------------------- | ----------------------------------------------- |
| Catalog / roster / availability reads         | `[ADMIN, MANAGER, TALENT_MANAGER]`              |
| Show creator list read                        | `[ADMIN, MANAGER, TALENT_MANAGER]`              |
| Bulk assign / remove creators                 | `[ADMIN, MANAGER, TALENT_MANAGER]`              |
| Studio member roster reads                    | `[ADMIN, MANAGER]`                              |
| Studio member roster writes                   | `[ADMIN]`                                       |
| Studio creator roster writes                  | `[ADMIN]`                                       |
| Studio show writes                            | `[ADMIN, MANAGER]`                              |
| Show / shift-block actuals writes             | `[ADMIN, MANAGER]`                              |
| Compensation line item reads                  | `[ADMIN, MANAGER]`                              |
| Compensation line item writes                 | `[ADMIN, MANAGER]`                              |
| Snapshot-field override writes                | `[ADMIN, MANAGER]`                              |
| Member self-compensation view                 | `[ADMIN, MANAGER, self]`                        |
| Creator self-compensation view                | `[ADMIN, MANAGER, TALENT_MANAGER, self]`        |
| Operational economics reads (PR 13/14)        | `[ADMIN, MANAGER]`                              |
| Show planning export (page-local, PR 2)       | `[ADMIN, MANAGER]`                              |
| Recipient missing-actuals flag (PR 10)        | `[self]`                                        |
