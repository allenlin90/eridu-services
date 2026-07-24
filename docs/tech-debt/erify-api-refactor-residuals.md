# erify_api hardening program — deferred work

The `erify_api` hardening program (WI-01…WI-34, PRs #157–#200) is **complete**; the planning docs were retired and the methodology, patterns, decisions, and concerns live in skills (`codebase-hardening-program`, `repository-pattern-nestjs`, `service-pattern-nestjs`, `database-patterns`).

This register tracks only the **actionable work** that was deliberately deferred, so it isn't lost. Rationale/patterns live in the linked skill — this is the "do later" list.

| Deferred work | Trigger to fix | Rationale / pattern |
| --- | --- | --- |
| **Money representation** — decide direction (domain `Money` type vs. standardize on the canonical `decimalToString` and keep `Prisma.Decimal` internal). Then remove `Prisma.Decimal` from the one public signature (`compensationLineItemService.sumActiveAmountsByShowCreatorUids`) and converge the 3 divergent formatters. | A finance feature touches the money services, or the team commits to a `Money` type. | `service-pattern-nestjs` §2 (money/`Decimal` at the boundary). Value/precision-preserving, characterization-first. |
| **Google Sheets service-account identity** (was D7) — thread an explicit service-account/actor identity instead of reading `createdBy` off the schedule. Keep API-key auth. | Audit requirements on Sheets-originated writes, or any Sheets-auth change. | Auditability; low risk. |
| **`studioId`-fields-carrying-UIDs rename** (was D11) — rename to `studioUid` in the compensation slice (confirm no intentional repo-wide `...Id`-for-UID convention first). | The compensation slice is refactored. | Naming clarity; low risk. |
| **Optional test coverage** — `WI-T-comp-extra`, `WI-T-report-extra`, `WI-T-audit` (net-new specs with no active refactor to protect; the higher-priority WI-T* all shipped). | A future change touches those surfaces. | Coverage only. |
