# LiteLLM Policy Scaffold

This directory contains reference templates for LiteLLM model routing, budget tiers, and budget-tier assignment. To actually apply these via API instead of the Admin UI, see [`litellm-admin-api`](../../.agents/skills/litellm-admin-api/SKILL.md).

## Deployed baseline

LiteLLM `1.91.0` runs on Railway as its own service with its own PostgreSQL and Redis, separate from the Open WebUI service. Its image tracks the `main-stable` tag rather than a pinned version, so re-verify the running version (`GET /openapi.json`, `info.version`) before relying on a specific capability. Open WebUI reaches it over Railway private networking:

```text
http://<litellm-service-name>.railway.internal:4000/v1
```

Public LiteLLM URLs are for the admin UI and external testing only.

### Management surface

The Railway deployment does not conveniently expose `config.yaml`, so models/credentials/aliases live in the DB-backed store ("Store Model in DB"), reachable two ways:

- **LiteLLM Admin UI** — manual, visual, good for one-off/pilot changes and monitoring.
- **Management API** — scriptable equivalent of the same DB-backed store (`/model/new`, `/team/new`, `/key/generate`, `/customer/new`, etc.); see [`litellm-admin-api`](../../.agents/skills/litellm-admin-api/SKILL.md) for the endpoint catalog. Prefer this for anything repeatable.

Either way: define stable company model aliases, not raw provider IDs, and add provider credentials as `os.environ/...` references, not committed files.

Treat `model-groups.example.yaml` as a reference for what to configure (or for a future repo-managed config path), not as an actively-applied config.

### Key env vars (LiteLLM service)

`DATABASE_URL`, `LITELLM_MASTER_KEY`, `LITELLM_SALT_KEY`, `UI_USERNAME`, `UI_PASSWORD`.

`LITELLM_MASTER_KEY` must never be given to Open WebUI. Open WebUI connects with a LiteLLM **virtual key** instead (Open WebUI: Admin Settings -> Connections -> OpenAI -> Add Connection, using the internal Railway URL + the virtual key). For scripting management-API calls from this repo, a separate scoped key (`LITELLM_ADMIN_KEY`, restricted to `management_routes` — no inference access) plus `LITELLM_HOST` live in `ai/litellm/.env` (gitignored; see `.env.example`). Never put the real `LITELLM_MASTER_KEY` in that file.

## Model aliases and access groups

Stable, provider-agnostic aliases: `company-fast`, `company-balanced`, `company-reasoning`, `company-coding`.

Access groups bundle aliases for team virtual keys:

| Access group | Aliases |
|---|---|
| `company-general` | `company-fast`, `company-balanced` |
| `company-power` | `company-reasoning`, `company-coding` |
| `company-admin` | all aliases |

Start with one team (`OpenWebUI-General`) -> one virtual key, allowed models = `company-general`. Splitting into per-function teams (`OpenWebUI-Ecommerce`, `OpenWebUI-Fulfillment`, `OpenWebUI-Livestream`, `OpenWebUI-Admin`) is a possible later step, not yet done.

## Customer/user tracking

Per-user tracking is automatic and needs no sync or pre-provisioning step. It is driven by Open WebUI's **global** user-info forwarding env vars, set on the Open WebUI Railway service:

```text
ENABLE_FORWARD_USER_INFO_HEADERS=True
FORWARD_USER_INFO_HEADER_USER_ID=x-litellm-customer-id
```

Open WebUI then sends `x-litellm-customer-id: <Open WebUI user UUID>` on every request, and LiteLLM records that value as a customer as requests arrive (LiteLLM UI -> Usage -> Customer Usage).

- **Known project behavior:** connection-level custom headers in Open WebUI were tested and found unreliable on this Railway setup. Use the global env vars above, not per-connection headers.
- Alternative: forward email (`FORWARD_USER_INFO_HEADER_USER_EMAIL=x-litellm-customer-id`) for human-readable names, at the cost of email-in-logs and emails changing over time. Only one mode should be active at a time. UUID is the governance-grade default; use email only if operational readability during rollout matters more.
- To map a customer UUID back to a person, query the Open WebUI Postgres `user` table (`id`, `username`, `name`, `email`, `role`, `last_active_at`) and join on `customer_id = user.id`. This is a manual/future-dashboard step, not automated yet.

## Budgets and rate limits

Basic tracking (above) comes first. Budgets and per-customer rate limits are a later maturity step (curated aliases -> fallback models -> team budgets -> per-customer budgets/rate limits -> spend analytics -> observability). Assign budget tiers to known customers using the role-to-tier policy below as reference, either by hand in the LiteLLM Admin UI (Customers/Budgets) or via `/customer/new` / `/customer/update` per [`litellm-admin-api`](../../.agents/skills/litellm-admin-api/SKILL.md) — still low-volume, admin-only work either way.

## Files

| File | Purpose |
|---|---|
| `budget-tiers.example.json` | Example budget and rate-limit tiers for users. |
| `customer-sync.example.json` | Example role-to-budget-tier policy reference for manually assigning tiers in the LiteLLM Admin UI (not required for usage tracking). |
| `model-groups.example.yaml` | Reference model + access-group taxonomy for the Admin UI (or a future repo-managed config). |

## Version sensitivity

Do not assume the latest LiteLLM docs apply. Verify any capability against the currently-running version (`1.91.0` as of last check, but this image tracks `main-stable` and moves — see Deployed baseline above) before presenting it as feasible, and prefer the Admin UI over hand-edited `config.yaml` on this Railway deployment.

Provider API keys stay in Railway environment variables. Do not commit real provider keys.
