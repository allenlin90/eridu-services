# `erify_api` Real-Database Integration Tests

This harness runs the architecture-refactoring safety checks against an isolated
PostgreSQL database. It never falls back to the normal `DATABASE_URL`.

## Run locally

Start the ephemeral database:

```bash
docker compose -f apps/erify_api/test/docker-compose.yml up -d --wait
```

Deploy the checked-in migrations and run the integration suite:

```bash
ERIFY_API_TEST_DATABASE_URL=postgresql://erify_test:erify_test@localhost:55432/erify_api_test \
  node apps/erify_api/test/run-integration-tests.mjs
```

Stop the database:

```bash
docker compose -f apps/erify_api/test/docker-compose.yml down
```

The database uses a Docker `tmpfs`; its contents disappear when the container
stops. The runner refuses a database whose name does not end in `_test`, a
non-local host, or a URL equal to the existing `DATABASE_URL`.

## Current safety gates

- inherited `BaseRepository` methods read earlier writes through the ambient CLS transaction;
- a thrown transactional workflow rolls back inherited repository writes;
- inherited restore targets a soft-deleted row and makes it active again;
- direct `ShowStatusService` persistence sees earlier writes and rolls back with the ambient transaction;
- shallow `ShowStatusService` CRUD preserves active-row filtering;
- the API DTO exposes the external UID instead of the internal database ID;
- a show is created through the real orchestration capability with UID relations;
- a late schedule-publish failure rolls back the publish run and status writes;
- the HTTP application composition root boots with all child modules;
- the MCP runtime module graph boots with real Prisma and CLS providers.
