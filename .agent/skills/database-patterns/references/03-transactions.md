# Transaction Pattern — Code Examples

## Basic Usage

```typescript
import { Transactional } from '@nestjs-cls/transactional';

@Injectable()
export class ShowOrchestrationService {
  constructor(
    private readonly showService: ShowService,
    private readonly showMcService: ShowMcService,
  ) {}

  @Transactional()
  async createShowWithMcs(data: CreateShowWithMcsPayload) {
    // No `tx` passed — CLS propagates it to all repository calls automatically
    const show = await this.showService.createShow(data);
    await this.showMcService.createMany(show.id, data.mcs);
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
