# Observability & Logging — Detailed References

Extended code examples for logging patterns.

## NestJS Logger Setup
```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TaskOrchestrationService {
  private readonly logger = new Logger(TaskOrchestrationService.name);

  async generateTasksForShows(...) {
    this.logger.log(`Generating tasks for ${showUids.length} shows in studio ${studioUid}`);
  }
}
```

## Error Logging — Include Stack Trace
```typescript
try {
  await this.processShow(showUid);
} catch (error) {
  this.logger.error(
    `Failed to process show ${showUid}`,
    error instanceof Error ? error.stack : String(error),
  );
  throw error; // Re-throw — do not swallow
}
```

## Warning for Known Degraded State
```typescript
if (templates.length === 0) {
  this.logger.warn(`No active templates found for studio ${studioUid}, generation skipped`);
  return [];
}
```

## Structured Log Format
```typescript
// ✅ Structured: operation + identifiers + outcome
this.logger.log(`[TaskGeneration] studio=${studioUid} shows=${showUids.length} result=started`);
this.logger.log(`[TaskGeneration] studio=${studioUid} show=${showUid} tasks_created=${count}`);
this.logger.warn(`[TaskGeneration] studio=${studioUid} show=${showUid} result=skipped reason=no_templates`);

// ❌ Unstructured — hard to grep/filter
this.logger.log('Starting task generation...');
this.logger.log('Done');
```

## Background Processor Logging (BullMQ)
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
    } catch (error) {
      this.logger.error(`[Job:${job.id}] Failed show=${showUid}`, error instanceof Error ? error.stack : String(error));
      throw error; // Let BullMQ handle retry
    }
  }
}
```

## Frontend Error Reporting
```typescript
function reportError(error: Error, context: Record<string, string>) {
  // Never include: auth tokens, user PII beyond user ID, raw API responses
  errorTracker.captureException(error, {
    extra: { route: context.route, userId: context.userId },
  });
}
```
