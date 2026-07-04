# LiteLLM Policy Scaffold

This directory contains reference templates for LiteLLM model routing, budget tiers, and budget-tier assignment.

## Deployed baseline

LiteLLM `1.89.3` runs on Railway as its own service with its own PostgreSQL and Redis, separate from the Open WebUI service. Open WebUI reaches it over Railway private networking:

```text
http://<litellm-service-name>.railway.internal:4000/v1
```

Public LiteLLM URLs are for the admin UI and external testing only.

### Management surface

The Railway deployment does not conveniently expose `config.yaml`, so the **LiteLLM Admin UI is the primary management surface**:

- Enable "Store Model in DB".
- Add provider credentials via the UI (LLM Credentials), not committed files.
- Define stable company model aliases in the UI, not raw provider IDs.

Treat `model-groups.example.yaml` as a reference for what to configure in that UI (or for a future repo-managed config path), not as an actively-applied config.

### Key env vars (LiteLLM service)

`DATABASE_URL`, `LITELLM_MASTER_KEY`, `LITELLM_SALT_KEY`, `UI_USERNAME`, `UI_PASSWORD`.

`LITELLM_MASTER_KEY` must never be given to Open WebUI. Open WebUI connects with a LiteLLM **virtual key** instead (Open WebUI: Admin Settings -> Connections -> OpenAI -> Add Connection, using the internal Railway URL + the virtual key).

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

Basic tracking (above) comes first. Budgets and per-customer rate limits are a later maturity step (curated aliases -> fallback models -> team budgets -> per-customer budgets/rate limits -> spend analytics -> observability). Assigning a budget tier to a known customer via LiteLLM's customer admin API is a legitimate future step, separate from tracking — see `scripts/ai/assign-litellm-budget-tiers.ts`.

## Files

| File | Purpose |
|---|---|
| `budget-tiers.example.json` | Example budget and rate-limit tiers for users. |
| `customer-sync.example.json` | Example role-to-budget-tier mapping for the budget-tier assignment step (not required for tracking). |
| `model-groups.example.yaml` | Reference model + access-group taxonomy for the Admin UI (or a future repo-managed config). |

## Version sensitivity

Do not assume the latest LiteLLM docs apply. Verify any capability against `1.89.3` before presenting it as feasible, and prefer the Admin UI over hand-edited `config.yaml` on this Railway deployment.

Provider API keys stay in Railway environment variables. Do not commit real provider keys.
