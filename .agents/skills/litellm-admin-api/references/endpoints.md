# LiteLLM Management API Endpoint Catalog

Sourced from `docs.litellm.ai` (main branch — `docs/proxy/model_management`, `virtual_keys`, `users`,
`customers`, `customer_usage`, `model_access_groups`, `access_control`, `cost_tracking`,
`budget_fallbacks`, `tag_budgets`). Confirm exact payload shapes against the deployed instance
before shipping a script that depends on a specific field — the docs track the latest release, not
necessarily the deployed version (`1.91.0` as of last check, but this image tracks `main-stable` and moves — see `ai/litellm/README.md`). `/model/info` and `/model/new` are explicitly BETA per
LiteLLM's own docs.

All paths below are relative to the deployed base URL (`LITELLM_HOST` from `ai/litellm/.env`, or the
Railway private DNS address). Management routes sit at the root; OpenAI-compatible inference routes
sit under `/v1`.

## Models — `/model/*`, `/v1/model/info`

| Method | Path | Purpose | Notes |
|---|---|---|---|
| POST | `/model/new` | Add a model to the DB-backed store without restarting the proxy | Body: `model_name`, `litellm_params` (required), `model_info` (optional, e.g. `access_groups`) |
| POST | `/model/update` | Update an existing model's params/info | |
| POST | `/model/delete` | Remove a model from the DB-backed store | Destructive — confirm first |
| GET | `/model/info` | List configured models with cost/token metadata | Sensitive fields (API keys) always excluded from the response. **Confirmed working with a `management_routes`-scoped key** — use this as the read/verification endpoint. |
| GET | `/v1/model/info` | Same data, OpenAI-compatible route prefix | **Confirmed on this deployment: a `management_routes`-scoped key gets 403 here** (`"Only allowed to call routes: ['management_routes']"`) — this route sits in a different permission category from the root path even though the payload is equivalent. Don't assume the two are interchangeable for a scoped key. |

Example add:

```bash
curl -X POST "$LITELLM_HOST/model/new" \
  -H "Authorization: Bearer $LITELLM_ADMIN_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "model_name": "company-fast",
    "litellm_params": {"model": "openai/gpt-4o-mini", "api_key": "os.environ/OPENAI_API_KEY"},
    "model_info": {"access_groups": ["company-general"]}
  }'
```

## Model Access Groups

Not a separate CRUD resource — `access_groups` is a tag set on `model_info` (per model, via `/model/new`
or `/model/update`, or via `config.yaml` on deployments that use it). A team or key then gets access
to every model in a group by naming the group instead of individual models in its `models` array. This
maps directly onto this repo's `company-general` / `company-power` / `company-admin` taxonomy — see
`ai/litellm/README.md`.

```bash
# Create a team scoped to the company-general access group
curl -X POST "$LITELLM_HOST/team/new" \
  -H "Authorization: Bearer $LITELLM_ADMIN_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"team_alias": "OpenWebUI-General", "models": ["company-general"]}'
```

## Virtual Keys — `/key/*`

| Method | Path | Purpose | Notes |
|---|---|---|---|
| POST | `/key/generate` | Create a virtual key | Body: `models`, `metadata`, `max_budget`, `budget_duration`, `tpm_limit`, `rpm_limit`, `max_parallel_requests`, `team_id`, `model_max_budget`, `budget_fallbacks` |
| POST | `/key/update` | Patch fields on an existing key | Body must include `key`; only the fields passed are changed (e.g. just `guardrails`, or just `temp_budget_increase` + `temp_budget_expiry`) |
| POST | `/key/delete` | Revoke one or more keys | Body: `keys` array — destructive, confirm first |
| GET | `/key/info` | Get a single key's config/spend | Query param `key` |
| GET | `/key/list` | List keys (filterable) | |
| POST | `/key/block` / `/key/unblock` | Suspend/resume a key without deleting it | Prefer over delete when the block may be temporary |
| GET | `/key/health` | Liveness/config check for a key | |

`upperbound_key_generate_params` (proxy-level setting) can silently cap requested `max_budget`,
`budget_duration`, `duration`, `max_parallel_requests`, `tpm_limit`, `rpm_limit` to an admin-configured
ceiling — a `/key/generate` call that looks like it succeeded may return a lower limit than requested.

```bash
curl -X POST "$LITELLM_HOST/key/generate" \
  -H "Authorization: Bearer $LITELLM_ADMIN_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"models": ["company-general"], "team_id": "<team_id>", "metadata": {"purpose": "openwebui-backend"}}'
```

## Teams — `/team/*`

| Method | Path | Purpose | Notes |
|---|---|---|---|
| POST | `/team/new` | Create a team | Body: `team_alias` (required), `models` (access-group or literal names), `members_with_roles`, `organization_id`, `rpm_limit`/`tpm_limit`, `max_budget` |
| POST | `/team/update` | Update team config/limits | |
| POST | `/team/member_add` | Add member(s) to a team | |
| POST | `/team/member_delete` | Remove member(s) | |
| POST | `/team/delete` | Delete a team | Destructive — confirm first |
| GET | `/team/info` | Get team config/spend | |
| GET | `/team/list` | List teams | |

Team-scoped virtual keys (`/key/generate` with `team_id` set) inherit the team's model access and
limits, per `ai-workspace-control-plane`'s "one virtual key per app/team" posture — this repo currently
runs one team (`OpenWebUI-General`), with per-function teams (`OpenWebUI-Ecommerce`, etc.) as a possible
later step, not yet done.

## Internal Users — `/user/*`

| Method | Path | Purpose | Notes |
|---|---|---|---|
| POST | `/user/new` | Create an internal proxy user (distinct from LiteLLM *customers*, see below) | Body: `user_email`, `user_role` (e.g. `internal_user` lets the user self-manage keys and view spend) |
| POST | `/user/update` | Update a user's role/limits | |
| GET | `/user/info` | Get a user's spend, keys, and teams | Query param `user_id` |
| POST | `/user/delete` | Delete a user | Destructive — confirm first |

Internal users are LiteLLM-proxy-admin-console accounts (people who log into the LiteLLM Admin UI or
own keys directly) — not the same concept as the customer/end-user tracking below. Don't conflate the
two when scripting Open WebUI integration; Open WebUI end users map to **customers**, not internal
users.

## Customers / End-Users — `/customer/*`

This is the layer `ai-workspace-control-plane` calls "customer/end-user limits = individual Open WebUI
user limit," populated automatically from the `x-litellm-customer-id` header Open WebUI forwards — no
pre-provisioning is required for usage tracking to start. Use `/customer/new` only when *assigning* a
budget/rate tier to a known customer, per `ai/litellm/README.md`'s budget-tier policy.

| Method | Path | Purpose | Notes |
|---|---|---|---|
| POST | `/customer/new` | Create/register a customer with a budget | Body: `user_id` (the Open WebUI user UUID), plus either `budget_id` (reference to a predefined budget) or an explicit `max_budget` |
| POST | `/customer/update` | Update a customer's budget/limits | |
| GET | `/customer/info` | Get a customer's spend/budget | |
| GET | `/customer/list` | List customers | |

```bash
curl -X POST "$LITELLM_HOST/customer/new" \
  -H "Authorization: Bearer $LITELLM_ADMIN_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"user_id": "<openwebui-user-uuid>", "max_budget": 25.0}'
```

## Budgets — `/budget/*`, `/tag/*`

| Method | Path | Purpose | Notes |
|---|---|---|---|
| POST | `/budget/new` | Define a reusable budget object (max spend + reset duration) | Reference it from `/customer/new` via `budget_id` instead of repeating `max_budget` per customer |
| POST | `/budget/update` | Update a budget object | Changes apply to every customer/key referencing it |
| POST | `/tag/new` / `/tag/update` | Budget scoped to a request tag rather than a key/user | `max_budget`, `budget_duration` (e.g. `"30d"`) |

Per-model budgets on a single key use `model_max_budget` in `/key/generate` or `/key/update`, paired
optionally with `budget_fallbacks` to reroute to a cheaper model once the primary's budget is hit —
see the Virtual Keys section above.

## Spend & Usage Reporting

| Method | Path | Purpose | Notes |
|---|---|---|---|
| GET | `/spend/logs?start_date=&end_date=` | Raw/aggregated spend log entries for a date range | |
| GET | `/global/spend/report?start_date=&end_date=` | Spend aggregated by API key/team/model over a range | Needs a key with `get_spend_routes` permission |
| GET | `/user/info?user_id=` | Per-internal-user spend + associated keys | See Internal Users above |
| GET | `/customer/info?user_id=` | Per-customer (Open WebUI end-user) spend | See Customers above |

Read-only reporting is safe to call with a narrowly-scoped key; it never needs the master key.

## Access Control

Route-level permissions (what a non-master-key can call) are enumerated in
`docs.litellm.ai/docs/proxy/access_control` — key operations are grouped as viewing
(`/key/info`, `/key/health`, `/key/list`), creating (`/key/generate`,
`/key/service-account/generate`), modifying (`/key/update`), and status changes (`/key/delete`,
`/key/regenerate`, `/key/block`, `/key/unblock`). Team/org creation (`/team/new` under an org) and
global spend reports are effectively master-key- or org-admin-key-only in practice — check the
response code before assuming a scoped key can reach an admin route; a 401/403 usually means a
missing route permission, not a malformed request.

**Confirmed on this deployment** with the key in `ai/litellm/.env`: it is scoped to the named
`management_routes` group and role `internal_user`. Root-path management routes it can reach
(`/model/info`) return 200; the OpenAI-compatible `/v1/model/info` returns 403 with
`"Virtual key is not allowed to call this route. Only allowed to call routes: ['management_routes']"`,
and admin-only routes like `/team/list` (list *all* teams) return 401 with
`"Only admin users can query all teams/other teams. Your user role=internal_user"`. Read the error
body — it names the missing permission group or required role, so don't guess at a fix.

## Health

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Proxy liveness (unauthenticated on most deployments) |
| GET | `/key/health` | Health check scoped to the calling key's configured models |
