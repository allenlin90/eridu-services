---
name: local-database-cli
description: Use when asked to run raw SQL queries, inspect schemas, verify data, or interact directly with the local Docker PostgreSQL development databases from an agent terminal.
---

# Local Database CLI Querying

Use this workflow to query the local Docker PostgreSQL databases with CLI tools such as `psql` or `pgcli`.

## Context

The local development databases run inside Docker containers. Connection strings are typically stored in the `.env` files of the respective applications. For instance:
- `apps/erify_api/.env` contains `DATABASE_URL` (for the main API database) and `ERIDU_AUTH_DATABASE_URL` (for the auth database).
- `apps/eridu_auth/.env` contains `DATABASE_URL` for the auth database when working directly in that app.

## Workflow

1. **Identify the target database**: Choose `DATABASE_URL` or `ERIDU_AUTH_DATABASE_URL` from the relevant app's `.env` file.
2. **Verify the DB container**: Ensure the local `database` Docker Compose service is running before attempting a connection.
3. **Execute the query**: Run `psql` when available; otherwise use `pgcli`.
4. **Report results carefully**: Summarize the result and never print real connection strings or credentials.

## Core Rules

### 1. Identify the Correct Database URL
- For API data (tasks, users, studios): Extract `DATABASE_URL` from `apps/erify_api/.env`.
- For Auth data (sessions, identities): Use `ERIDU_AUTH_DATABASE_URL` from `apps/erify_api/.env` or `DATABASE_URL` from `apps/eridu_auth/.env`.

### 2. Formulating the Command
Prefer sourcing the `.env` file and referencing the variable so real credentials do not appear in messages or copied command examples.

**Using `psql`:**
```bash
set -a
source apps/erify_api/.env
psql "$DATABASE_URL" -c "SELECT * FROM users LIMIT 10;"
```

For wider tables, use the `-x` flag (expanded display) to make the output readable in the terminal context:
```bash
psql "$DATABASE_URL" -x -c "SELECT * FROM users LIMIT 1;"
```

**Using `pgcli`:**
```bash
set -a
source apps/erify_api/.env
printf "%s\n" "SELECT * FROM users LIMIT 10;" | pgcli "$DATABASE_URL"
```

### 3. Safety Guardrails
- **Read-Only Default**: Default to `SELECT` queries only. Do not run `UPDATE`, `DELETE`, or `INSERT` unless explicitly instructed to modify local data by the user.
- **Limit Output**: Always append a `LIMIT` clause to your queries. Unbounded queries will flood the terminal output buffer and disrupt the agent context.
- **Production Guardrail**: Never query URLs prefixed with `PROD_` (e.g., `PROD_DATABASE_URL`) without explicit user consent. This skill is intended for the local Docker DB.
- **Sandbox Guardrail**: If Docker socket access, localhost database access, or CLI config/log writes are blocked by sandboxing, request the required permission instead of working around credentials or copying secrets into output.

## Example Execution Plan

If asked to "Check the latest task in the local DB":

1. Confirm `DATABASE_URL` exists in `apps/erify_api/.env` without printing the value.
2. Confirm the local Docker database service is running.
3. Execute:
    ```bash
    set -a
    source apps/erify_api/.env
    psql "$DATABASE_URL" -x -c "SELECT * FROM tasks ORDER BY created_at DESC LIMIT 1;"
    ```
