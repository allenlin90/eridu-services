---
name: observability-logging
description: Structured logging patterns for erify_api and eridu_auth. Use when adding logging to a service, deciding what to log at which level, avoiding sensitive data in logs, or setting up observability in a new module. Covers NestJS Logger usage, log level selection, what to never log, and frontend error reporting patterns.
---

# Observability & Logging

> See [references/logging-examples.md](references/logging-examples.md) for extended code examples.

## NestJS Logger — Setup

Use `new Logger(ClassName.name)` as private instance property. Never `console.log`.

**Where to log**: orchestration services (start/completion/counts), BullMQ processors (every stage).
**Where NOT to**: model services (simple CRUD), repositories, controllers.

## Log Levels

| Level | When | Example |
|---|---|---|
| `log` | Normal milestones | "Generated 12 tasks for show_abc" |
| `warn` | Unexpected but recoverable | "No templates, skipping" |
| `error(msg, stack)` | Caught errors needing investigation | DB write failed |
| `debug` | Dev-only tracing | Internal loop state |
| `verbose` | High frequency trace | Avoid in production |

## Log Format

Pattern: `[OperationName] key=value key=value result=outcome`

Structured and searchable. Avoid unstructured messages like "Starting..." or "Done".

## What to NEVER Log

| Never log | Why |
|---|---|
| JWT tokens, API keys, session IDs | Credential exposure |
| Full auth request bodies | May contain passwords |
| Internal BigInt database IDs | Exposes DB sequence |
| Full Prisma error objects | May contain SQL with values |
| `JSON.stringify(error)` | May include sensitive data |

**Rules**: Use UID (not ID) in logs. Log `error.stack` (not full object). Log presence (`!!apiKey`), not value.

## BullMQ Processors

Log every stage — no HTTP response to observe. Include `[Job:${job.id}]` prefix. Re-throw errors for retry.

## Frontend Error Reporting

Use global mutation error handler and `ErrorBoundary`. Never include auth tokens or PII beyond user UID.

## Related Skills

- [backend-controller-pattern-nestjs](../backend-controller-pattern-nestjs/SKILL.md) — Global exception filter
- [frontend-error-handling](../frontend-error-handling/SKILL.md) — User-facing errors
- [secure-coding-practices](../secure-coding-practices/SKILL.md) — What must never be logged
