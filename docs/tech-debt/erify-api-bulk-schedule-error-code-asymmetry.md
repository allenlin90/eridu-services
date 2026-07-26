# Bulk schedule create and update map not-found errors differently

## Affected surface

`ScheduleService.bulkCreateSchedules()` and
`ScheduleService.bulkUpdateSchedules()` in
`apps/erify_api/src/models/schedule/schedule.service.ts`.

## Current behavior

Both bulk methods preserve partial success by catching each item's exception
and returning an error code. The update path maps a 404 `HttpException` to
`NOT_FOUND`; the create path maps only bad-request and conflict exceptions and
falls back to `UNKNOWN_ERROR` for every other exception, including a 404.

The opt-in 1,000-item measurement intentionally throws a generic error and
correctly pins `UNKNOWN_ERROR` for that artificial failure. It does not decide
how a real not-found exception should be classified.

## Desired behavior

Define one shared, documented error-code mapping for equivalent create and
update failures. Preserve the partial-success contract and distinguish generic
failures from a confirmed not-found condition. Treat this as an API behavior
change with compatibility coverage, not as refactor cleanup.

## Risk

Clients cannot reliably interpret equivalent item failures across the two bulk
operations. Changing the create mapping without auditing current consumers may
also alter behavior that a client has learned to treat as `UNKNOWN_ERROR`.

## Trigger to fix

Resolve the mapping before the bulk response contract is extended, a client
starts branching on these error codes, or the schedule bulk implementation is
otherwise changed.
