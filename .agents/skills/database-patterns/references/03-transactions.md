# Transaction Pattern — Code Examples

## Basic Usage

```typescript
import { Transactional } from '@nestjs-cls/transactional';

@Injectable()
export class ShowOrchestrationService {
  constructor(
    private readonly showService: ShowService,
    private readonly showMcService: ShowMcService, // DB-level service (Prisma model: ShowMC)
  ) {}

  @Transactional()
  async createShowWithAssignments(data: CreateShowWithAssignmentsPayload) {
    // No `tx` passed — CLS propagates it to all repository calls automatically
    const show = await this.showService.createShow(data);
    await this.showMcService.createMany(show.id, data.creators);
    return show;
  }
}
```

---

## Anti-Pattern 1: Self-Invocation (Proxy Bypass)

`@Transactional()` is silently ignored when called via `this.method()` in the same class.

```typescript
// ❌ BROKEN: Self-invocation bypasses NestJS AOP proxy — no transaction created
class MyService {
  async doWork() {
    await this.innerWork(); // NOT intercepted by proxy
  }

  @Transactional()
  private async innerWork() {
    // TX is NOT active here!
  }
}

// ✅ CORRECT: Extract to a separate injectable, call goes through DI proxy
@Injectable()
class MyProcessor {
  @Transactional()
  async process() {
    // TX active ✅
  }
}

@Injectable()
class MyService {
  constructor(private processor: MyProcessor) {}

  async doWork() {
    await this.processor.process(); // Intercepted by DI proxy ✅
  }
}
```

---

## Anti-Pattern 2: Swallowing Errors (Silent Partial Commit)

`@Transactional()` only rolls back if an **unhandled error propagates out** of the method.
Catching errors internally causes the decorator to commit partial writes.

```typescript
// ❌ BROKEN: Error caught inside → @Transactional COMMITS partial work
@Transactional()
async processShow(show: Show, templates: Template[]) {
  try {
    const task = await this.taskService.create(...);  // Task row written
    await this.taskTargetService.create(...);          // ← Throws here
  } catch (error) {
    // Error swallowed → @Transactional sees a normal return → COMMITS the orphaned Task
    this.showStatus = 'error';
  }
  return { status: this.showStatus };
}

// ✅ CORRECT: Let errors propagate — @Transactional rolls back all writes atomically
@Transactional()
async processShow(show: Show, templates: Template[]) {
  const task = await this.taskService.create(...);  // Rolled back on error ✅
  await this.taskTargetService.create(...);          // Error propagates out ✅
  return { status: 'success' };
}

// ✅ Per-item resilience belongs in the CALLER, OUTSIDE the transaction boundary
for (const show of shows) {
  try {
    // processShow() throws → @Transactional already rolled back before this catch runs
    const result = await this.processor.processShow(show, templates);
    results.push(result);
  } catch (error) {
    // Record failure without affecting other shows' transactions
    results.push({ show_uid: show.uid, status: 'error', error: error.message });
  }
}
```

---

## Anti-Pattern 3: Nested `@Transactional()` Reuse Rolls Back an Independent Write

`@nestjs-cls/transactional` propagates the transaction through CLS: when a `@Transactional()` method calls another `@Transactional()` method, the callee reuses the caller's ambient transaction rather than opening a new one — even across service boundaries, even several calls deep. That's correct for one logical unit of work, but it means a write followed by a throw **anywhere in that call chain** rolls back together, even if the write was meant to survive the throw (e.g. an audit row recording "this was rejected").

```typescript
// ❌ BROKEN: checkEligibility's audit write shares the caller's ambient
// transaction (nested @Transactional() reuses it via CLS), so the throw
// below rolls the audit write back too — the rejection is never recorded.
@Injectable()
class ConflictService {
  @Transactional()
  async checkEligibility(id: bigint): Promise<{ eligible: boolean }> {
    if (await this.isIneligible(id)) {
      await this.auditService.create({ outcome: 'auto_resolved_no_longer_conflicting' }); // rolled back below
      return { eligible: false };
    }
    return { eligible: true };
  }
}

@Injectable()
class OrchestratorService {
  @Transactional() // ← nested: reuses ConflictService's ambient transaction
  async resolve(id: bigint) {
    const { eligible } = await this.conflictService.checkEligibility(id);
    if (!eligible) {
      throw HttpError.conflict('NO_LONGER_ELIGIBLE'); // rolls back checkEligibility's audit write too
    }
    // ... apply writes ...
  }
}

// ✅ CORRECT: split into two genuinely separate @Transactional() calls,
// invoked from a non-transactional orchestrating method. The first call's
// commit is independent of whatever the second call (or the throw between
// them) does.
@Injectable()
class OrchestratorService {
  async resolve(id: bigint) {
    const { eligible } = await this.conflictService.checkEligibility(id); // own transaction, commits here
    if (!eligible) {
      throw HttpError.conflict('NO_LONGER_ELIGIBLE'); // no transaction open — nothing to roll back
    }
    await this.conflictService.applyEligible(id); // second, separate transaction
  }
}
```

Real example: `ScheduleConflictService.checkEligibility` / `applyConflict` (`apps/erify_api/src/models/schedule-conflict/schedule-conflict.service.ts`) and the orchestrating `StudioShowManagementService.resolveScheduleConflict` / `applyEligibleScheduleConflict` (`apps/erify_api/src/studios/studio-show/studio-show-management.service.ts`). `resolveScheduleConflict` is deliberately **not** `@Transactional()` — it calls `checkEligibility` (own transaction, may write an auto-resolve audit row and return `{ eligible: false }`), throws `SHOW_NO_LONGER_ELIGIBLE` itself once that call returns with no transaction open, and otherwise calls `applyEligibleScheduleConflict` (a second, separate `@Transactional()` method) to perform the actual apply writes.

---

## Anti-Pattern 4: `createdAt`-Only Ordering Ties Within One Transaction

Postgres' `now()` — backing every `@default(now())` column — returns the **same value for every statement in one transaction**, not wall-clock time per statement. Any query that orders by (or uses Prisma `distinct` keyed on) a `createdAt`-only sort loses its tie-breaker whenever two rows it needs to distinguish were written in the same transaction, and picks between them non-deterministically.

```typescript
// ❌ BROKEN: if writeA and writeB commit in the same transaction, they can
// share one createdAt value — ordering by createdAt alone can return either
// row first, non-deterministically.
async findLatest(showId: bigint) {
  return this.tx.event.findFirst({
    where: { showId },
    orderBy: { createdAt: 'desc' },
  });
}

// ✅ CORRECT: add the autoincrement id as a secondary sort key. Insertion
// order within a transaction is still deterministic even when createdAt
// ties.
async findLatest(showId: bigint) {
  return this.tx.event.findFirst({
    where: { showId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
}
```

The same fix applies to Prisma `distinct`: `distinct` picks the first row per group according to `orderBy`, so a `createdAt`-only `orderBy` has the identical tie-break gap for a `distinct`-per-group query, not just a plain `findFirst`.

This is easy to introduce more than once in the same feature: a single-row `findFirst`/`findLatest`-style lookup and a `distinct`-by-group review-queue query can both need the same tie-breaker independently, and fixing one does not fix the other — grep for every `orderBy: { createdAt: ... }` (or `orderBy: { audit: { createdAt: ... } }` for a related-table sort) touching a table whose rows can be written multiple times in one transaction, not just the one call site a review first flags.

Real example: `AuditRepository.findLatestScheduleConflictForShow` and `findPendingStaleConflictsForStudio` (`apps/erify_api/src/models/audit/audit.repository.ts`) — `ScheduleConflictService.reconcileShowConflict` can write a resolved row and its replacement opened row in the same transaction (see Anti-Pattern 3's real example), so both queries need `[{ audit: { createdAt: 'desc' } }, { audit: { id: 'desc' } }]`, not `createdAt` alone.

---

## Legacy Pattern (DO NOT USE)

```typescript
// ❌ OLD — do not write new code using explicit tx passing
await prisma.$transaction(async (tx) => {
  await tx.show.create({ data });
  await tx.showMc.createMany({ data: mcs });
});

// ✅ NEW — use @Transactional() instead
@Transactional()
async createShow() { ... }
```
