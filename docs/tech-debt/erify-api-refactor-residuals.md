# erify_api hardening program — deferred residuals

The `erify_api` pattern/convention hardening program (themes T1–T11, work items WI-01…WI-34, PRs #157–#200) is **complete**: every structural theme landed behind-green, and the planning docs (`erify-api-pattern-audit-refactor-plan.md`, `erify-api-refactor-work-items.md`) were retired. Baseline grew **130 suites / 1157 tests → 142 / 1254**.

This register preserves the handful of items that were **deliberately deferred** rather than shipped, so they aren't lost with the planning docs.

## 1. Money representation — shared util / `Decimal`-at-boundary (was WI-13 / T4 / D4) · **needs a direction decision**

- **Affected surface:** `studio-cost-calculator.service`, `studio-performance(-calculator).service`, `compensation-line-item.service` (`sumActiveAmountsByShowCreatorUids → Map<string, Prisma.Decimal>`), `creator-compensation.service`, `studio-shift.service`, the three money formatters (`decimalToString` in `lib/utils`, `decimalLikeToString` in `creator-compensation.util`, the local `formatDecimal` in `studio-performance-calculator`).
- **Current behavior:** `Prisma.Decimal` is instantiated inside services and appears in at least one public service signature; three format helpers coexist with **different semantics** — `decimalToString` throws on a JS number, `decimalLikeToString` is lenient (no throw), `formatDecimal` is parse-then-format-with-fallback. `decimalToString` is the de-facto canonical formatter (24+ call sites).
- **Why it was deferred (not a behavior-preserving sweep):** collapsing the three formatters changes behavior (the number-guard differs); and converting the public `Map<string, Prisma.Decimal>` to strings only **moves** `new Prisma.Decimal` to the consumer (which does `.plus()` math) — adding parse churn + a precision round-trip rather than removing Decimal. D4 itself scopes domain-`Money` adoption as "incremental."
- **Desired behavior:** a deliberate Money-direction decision — (a) a shared domain `Money` type adopted incrementally; (b) keep `Prisma.Decimal` internally but standardize on the one canonical formatter; or (c) leave as-is. Recommended near-term: **(b)**.
- **Risk:** money path — any change must be value- and precision-preserving with characterization first.
- **Trigger to fix:** a finance feature touches these services, or the team commits to a domain-`Money` type.

## 2. `BaseRepository` inherited methods escape the ambient transaction · low / latent

- **Affected surface:** `lib/repositories/base.repository.ts` and every repo extending it.
- **Current behavior:** `BaseRepository` binds `super(new PrismaModelWrapper(prisma.<model>))` to the **unbounded** `PrismaService`, so *inherited* base methods (`create`/`update`/`softDelete`/`delete`/`count`) don't participate in `@Transactional` flows. WI-10 (#199) fixed the **explicit write methods** repos actually call inside transactions (routing through `txHost.tx`), matching the canonical `task.repository` convention — but the inherited base methods remain on the unbounded client.
- **Desired behavior:** make `BaseRepository` resolve its delegate lazily from `TransactionHost` so inherited methods participate too.
- **Risk:** medium — touches the base of every repository; needs a transaction-rollback characterization across representative repos.
- **Trigger to fix:** a service starts calling an inherited base write method inside a transaction and needs it to roll back, or a base-repository refactor is otherwise in scope.

## 3. Google Sheets service-account identity (was D7) · never ticketed

- **Affected surface:** `uploads`/google-sheets controller + `schedule` reads.
- **Current behavior:** API-key auth (correct for Apps Script service-to-service), but actor identity is read off `createdBy` on the schedule rather than an explicit service-account/actor identity.
- **Desired behavior:** thread an explicit service-account/actor identity for auditability. Keep API-key auth.
- **Risk:** low. **Trigger:** audit requirements on Sheets-originated writes, or any Sheets-auth change.

## 4. `studioId`-fields-carrying-UIDs rename (was D11) · never ticketed

- **Affected surface:** the compensation slice (and confirm no intentional repo-wide `...Id`-for-UID convention first).
- **Current behavior:** some `studioId`-named fields actually carry UID strings.
- **Desired behavior:** rename to `studioUid` within the compensation slice for clarity.
- **Risk:** low (naming). **Trigger:** the compensation slice is refactored.

## 5. Optional test-coverage additions · low

`WI-T-comp-extra`, `WI-T-report-extra`, `WI-T-audit` were net-new coverage whose dependents are now done/deferred — optional additions with no active refactor to protect. Add only if a future change touches those surfaces. (The higher-priority test-hardening items WI-T2/T3/T5/T7/T-platform/T-analytics all shipped.)
