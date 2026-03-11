---
name: observability-logging
description: Structured logging patterns for erify_api and eridu_auth. Use when adding logging to a service, deciding what to log at which level, avoiding sensitive data in logs, or setting up observability in a new module. Covers NestJS Logger usage, log level selection, what to never log, and frontend error reporting patterns.
---

# Observability & Logging

---

## 1. NestJS Logger — Setup

Use NestJS's built-in `Logger` from `@nestjs/common`. Inject it as a private instance property — never instantiate a shared logger or use `console.log`.

```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TaskOrchestrationService {
  private readonly logger = new Logger(TaskOrchestrationService.name);
  //                                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //                                    Use class name as context — shows in log output

  async generateTasksForShows(...) {
    this.logger.log(`Generating tasks for ${showUids.length} shows in studio ${studioUid}`);
    // ...
  }
}
```

**Where to add a logger**:
- Orchestration services — log operation start, completion, and counts
- Background processors (BullMQ jobs) — log every stage
- Guard-level failures should NOT be logged here — they surface via HTTP response

**Where NOT to add a logger**:
- Model services doing simple CRUD — too noisy
- Repository methods — handled at service level
- Controllers — errors are handled by global exception filter

---

## 2. Log Levels

| Level | When to use | Example |
|---|---|---|
| `this.logger.log(...)` | Normal operation milestones | "Generated 12 tasks for show_abc" |
| `this.logger.warn(...)` | Unexpected but recoverable state | "Show has no active templates, skipping" |
| `this.logger.error(msg, stack)` | Caught errors that need investigation | DB write failed, external API timeout |
| `this.logger.debug(...)` | Verbose dev-only tracing | Internal loop state, query params |
| `this.logger.verbose(...)` | Very high frequency, trace-level | Avoid in production paths |

```typescript
// ✅ Correct error logging — include stack trace
try {
  await this.processShow(showUid);
} catch (error) {
  this.logger.error(
    `Failed to process show ${showUid}`,
    error instanceof Error ? error.stack : String(error),
  );
  throw error;  // Re-throw — do not swallow
}

// ✅ Warning for known degraded-but-safe state
if (templates.length === 0) {
  this.logger.warn(`No active templates found for studio ${studioUid}, generation skipped`);
  return [];
}
```

---

## 3. What to NEVER Log

These are **hard rules** — violations can expose credentials or PII:

| Never log | Why |
|---|---|
| JWT tokens, API keys, session IDs | Credential exposure in log aggregators |
| Full request bodies on auth endpoints | May contain passwords |
| User passwords (any encoding) | Obvious |
| Internal BigInt database IDs | Exposes DB sequence, leaks internal model |
| Full Prisma error objects | May contain SQL with embedded values |
| `JSON.stringify(error)` on unknown errors | May include sensitive nested data |

```typescript
// ❌ Leaks internal DB ID
this.logger.log(`Created record with id ${record.id}`);  // id is BigInt

// ✅ Use UID in logs
this.logger.log(`Created record ${record.uid}`);

// ❌ Logs full error object — may contain SQL or user data
this.logger.error('Operation failed', JSON.stringify(error));

// ✅ Log message + stack trace only
this.logger.error('Operation failed', error instanceof Error ? error.stack : String(error));
```

---

## 4. Log Message Format

Keep log messages machine-readable and searchable:

```typescript
// ✅ Structured: operation + identifiers + outcome
this.logger.log(`[TaskGeneration] studio=${studioUid} shows=${showUids.length} result=started`);
this.logger.log(`[TaskGeneration] studio=${studioUid} show=${showUid} tasks_created=${count}`);
this.logger.warn(`[TaskGeneration] studio=${studioUid} show=${showUid} result=skipped reason=no_templates`);

// ❌ Unstructured — hard to grep/filter
this.logger.log('Starting task generation...');
this.logger.log('Done');
```

Pattern: `[OperationName] key=value key=value result=outcome`

---

## 5. Background Processor Logging (BullMQ)

Processors that run as background jobs must log every stage — there's no HTTP response to observe:

```typescript
@Processor(TASK_GENERATION_QUEUE)
export class TaskGenerationProcessor {
  private readonly logger = new Logger(TaskGenerationProcessor.name);

  async process(job: Job<TaskGenerationJobPayload>) {
    const { studioUid, showUid } = job.data;
    this.logger.log(`[Job:${job.id}] Processing show=${showUid} studio=${studioUid}`);

    try {
      const result = await this.processShow(studioUid, showUid);
      this.logger.log(`[Job:${job.id}] Completed show=${showUid} tasks_created=${result.count}`);
      return result;
    } catch (error) {
      this.logger.error(
        `[Job:${job.id}] Failed show=${showUid}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;  // Let BullMQ handle retry
    }
  }
}
```

---

## 6. Frontend Error Reporting

The frontend does not have a structured logger — use the global mutation error handler and TanStack Router's `errorComponent` to surface errors to users (see `frontend-error-handling` skill).

For production error tracking (e.g. Sentry-style), capture in `componentDidCatch` / `ErrorBoundary` **after** confirming no sensitive data is in the error payload:

```typescript
// In ErrorBoundary or error-tracking integration
function reportError(error: Error, context: Record<string, string>) {
  // Never include: auth tokens, user PII beyond user ID, raw API responses
  errorTracker.captureException(error, {
    extra: {
      route: context.route,
      userId: context.userId,  // UID only, not email or name
    },
  });
}
```

---

## Related Skills

- **[Backend Controller Pattern](../backend-controller-pattern-nestjs/SKILL.md)**: Global exception filter handles HTTP error logging — don't duplicate in services.
- **[Frontend Error Handling](../frontend-error-handling/SKILL.md)**: How errors surface to users on the frontend.
- **[Secure Coding Practices](../secure-coding-practices/SKILL.md)**: What data must never be logged, stored, or exposed.
