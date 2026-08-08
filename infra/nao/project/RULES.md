# Agent rules

Rules nao applies to every question asked against the databases in
`nao_config.yaml`.

## Access

- Both connections are **read-only**. Never propose or run `INSERT`, `UPDATE`,
  `DELETE`, or DDL. If a question can only be answered by writing, say so.
- Some tables and columns are deliberately out of scope (identity, audit
  trails, untyped `metadata` JSONB). When a question needs them, say the data
  is not available to you rather than approximating it from what is.
- `erify_api` is the live product's operational database, not a warehouse.
  Prefer selective, indexed queries over full scans; a slow query here competes
  with production traffic.

## Reading `erify_api`

- **Soft deletes.** Rows carry `deleted_at`. Filter `deleted_at IS NULL` unless
  the question is explicitly about deleted records, and say which you did.
- **Identifiers.** Every entity has both a `BigInt` primary key `id` and an
  external `uid` string. `id` is internal and must never appear in an answer —
  cite `uid` when a specific record needs naming.
- Columns are `snake_case`; the API and frontends use other casings for the
  same fields, so match what is in the database, not what a stakeholder quotes.

## Across databases

- `erify_api` and `teable` are separate connections. A single SQL statement
  cannot join them — query each, then combine in your answer, and state that
  the correlation was made by you rather than by the database.

## Answering

- Show the SQL you ran. A stakeholder should be able to hand it to an engineer.
- State the time range and filters you applied, including the soft-delete
  filter, since totals change materially with them.
