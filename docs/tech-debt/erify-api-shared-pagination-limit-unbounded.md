# Shared REST pagination limit diverges from the documented standard

## Affected surface

`apps/erify_api/src/lib/pagination/pagination.schema.ts` defines
`paginationBaseSchema`, which is reused by most REST list endpoints.

## Current behavior

The shared `limit` field validates integer values greater than zero, defaults
to 10, and has no hard maximum. The canonical API performance pattern specifies
a default of 20 and a maximum of 100. Individual schemas can override the
shared field, but most consumers inherit its divergent contract.

The standard offset-pagination contract intentionally leaves `page` without an
arbitrary maximum. Large offsets can become expensive, but the repository
guidance calls for measuring that behavior and considering cursor pagination
when a use case needs stable iteration above 100,000 rows.

The MCP list tools do not use this shared REST schema and enforce their own
`limit <= 100` contract.

## Desired behavior

Audit shared-schema consumers for compatibility, then add the standard
`limit <= 100` ceiling at the shared boundary. Decide separately whether each
consumer can move from the current default of 10 to the documented default of
20; do not silently combine a default change with the hard-cap fix. Keep offset
pagination unless measurements show that a specific list needs cursor
pagination.

## Risk

An HTTP client can request an excessively large page size from endpoints that
use the shared schema, increasing database work, response size, memory use, and
request latency. Adding the ceiling without auditing callers could also reject
an existing client contract. Changing the shared default at the same time could
alter response sizes, database load, and pagination behavior for clients that
omit `limit`.

## Trigger to fix

Complete the compatibility audit and shared cap before another list endpoint
adopts `paginationBaseSchema`, or when measured list performance makes the
unbounded contract an active operational issue. Record the audited decision for
the default of 10 versus 20 before changing it.
