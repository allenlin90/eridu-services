---
name: openwebui-litellm-railway-integration-guide
description: Guide and reference for the company's Open WebUI 0.9.6 + LiteLLM 1.89.3 Railway integration, including setup, tracing, governance, and version-aware official documentation checks.
---

# Open WebUI + LiteLLM Railway Integration Guide

## Purpose

Use this skill when helping with the company's current Open WebUI and LiteLLM deployment, especially for configuration, debugging, model gateway setup, usage tracking, Railway deployment, MCP/tool planning, Google Sheets bridges, and future AI workflow adoption.

This skill is a project-specific operational reference. It should guide answers about the existing architecture and prevent recommendations that bypass the intended gateway, governance, or tracing design.

---

## Project baseline

Treat these as the deployed baseline unless the user explicitly says they have upgraded:

- Open WebUI: `0.9.6`
- LiteLLM: `1.89.3`
- Hosting: Railway
- Deployment pattern: Open WebUI and LiteLLM are deployed as separate Railway services.
- Data services: Open WebUI and LiteLLM each have paired PostgreSQL and Redis services.
- Company size: about 30 people across 3 main teams.
- Business functions: e-commerce, fulfillment, livestream-related operations.
- Adoption goal: controlled AI assistant workflows for semi-automation and full automation, reducing arbitrary decisions, misunderstanding, overthinking, misalignment, and training burden.

When a setup or feature may be version-sensitive, do not assume latest documentation applies. Check the official documentation and release/version context against Open WebUI `0.9.6` and LiteLLM `1.89.3` before presenting it as feasible.

---

## Official-documentation rule

When the user asks about setup, configuration, or feasible features:

1. Prefer official sources:
   - Open WebUI docs: `https://docs.openwebui.com/`
   - Open WebUI GitHub releases/issues when version-specific: `https://github.com/open-webui/open-webui`
   - LiteLLM docs: `https://docs.litellm.ai/`
   - LiteLLM GitHub releases/issues when version-specific: `https://github.com/BerriAI/litellm`
   - Railway docs: `https://docs.railway.com/`
2. Check whether the documentation mentions the relevant version or whether the feature existed by the deployed version.
3. If documentation is for a newer version or unclear, say so and describe a safe verification step.
4. Prefer tested/current project behavior over theoretical documentation when they conflict.
5. Do not recommend editing LiteLLM `config.yaml` as the primary path because the Railway deployment is managed through Railway/template/UI and direct config-file access is not convenient.

---

## Architecture summary

Use this mental model:

```text
Company users
   ↓
Open WebUI 0.9.6
   - User-facing AI workspace
   - Company-wide skills/instructions
   - Team assistants and presets
   - Knowledge bases
   - MCP/tool connections
   - User/group access control
   ↓ OpenAI-compatible API
LiteLLM 1.89.3
   - AI gateway/control plane
   - Provider credentials
   - Model aliases
   - Virtual keys
   - Teams/access groups
   - Budgets/rate limits
   - Usage/spend/customer tracking
   ↓
OpenRouter / OpenAI / Anthropic / Gemini / other providers

Operational data layer
   - Existing Railway monorepo server APIs
   - React SPAs
   - Future MCP servers
   - Google Sheets bridges for departments without operational apps
   - PostgreSQL/Redis-backed services
```

Primary design decision:

- Open WebUI is the user workspace.
- LiteLLM is the AI gateway and governance layer.
- General staff should not connect Open WebUI directly to OpenRouter/OpenAI/Anthropic/Gemini unless there is a deliberate exception.

---

## Railway networking rule

When Open WebUI calls LiteLLM inside the same Railway project/environment, prefer Railway private networking.

Use this URL pattern in Open WebUI:

```text
http://<litellm-service-name>.railway.internal:4000/v1
```

Example:

```text
http://litellm.railway.internal:4000/v1
```

Use the public LiteLLM URL for browser/admin UI access and direct external testing. Use the internal Railway URL for service-to-service traffic when possible.

---

## LiteLLM Railway environment variables

Keep bootstrap and security configuration in Railway variables.

Recommended minimum:

```bash
DATABASE_URL=<Railway Postgres URL>
LITELLM_MASTER_KEY=sk-<long-random-admin-key>
LITELLM_SALT_KEY=sk-<long-random-salt-key>
UI_USERNAME=<admin-username>
UI_PASSWORD=<admin-password>
```

Rules:

- Do not use `LITELLM_MASTER_KEY` in Open WebUI.
- Use a LiteLLM virtual key for Open WebUI.
- Set `LITELLM_SALT_KEY` before storing provider credentials in LiteLLM UI.
- Provider credentials such as OpenRouter keys can be stored through LiteLLM UI instead of Railway env vars.
- Redis may remain attached for features such as caching/rate-limit infrastructure depending on the deployment template.

---

## LiteLLM UI configuration baseline

Because the Railway deployment does not conveniently expose `config.yaml`, prefer the LiteLLM Admin UI.

### Enable model definitions in DB

In LiteLLM UI:

```text
Models + Endpoints
→ Settings / gear
→ Store Model in DB
→ Enable
```

This allows adding/editing model definitions from the UI without editing `config.yaml` or restarting the proxy.

### Add provider credentials

In LiteLLM UI:

```text
Models
→ LLM Credentials
→ Add Credential
```

Example:

```text
Credential name: openrouter-company
Provider: OpenRouter
API Key: <OpenRouter key>
```

### Add stable company model aliases

Expose company-facing aliases instead of raw provider IDs.

Recommended aliases:

```text
company-fast
company-balanced
company-reasoning
company-coding
```

Example mapping:

```text
company-fast       → openrouter/<fast-model-id>
company-balanced   → openrouter/<balanced-model-id>
company-reasoning  → openrouter/<reasoning-model-id>
company-coding     → openrouter/<coding-model-id>
```

Model/access groups should start simple:

```text
company-general
  - company-fast
  - company-balanced

company-power
  - company-reasoning
  - company-coding

company-admin
  - all approved aliases
```

### Create teams and virtual keys

Start with:

```text
Team:
  OpenWebUI-General

Allowed models/access groups:
  company-general

Virtual key:
  sk-...
```

Future team split may include:

```text
OpenWebUI-Ecommerce
OpenWebUI-Fulfillment
OpenWebUI-Livestream
OpenWebUI-Admin
```

Use LiteLLM virtual keys to control which models Open WebUI can access. Do not expose raw provider keys to Open WebUI general users.

---

## Open WebUI connection to LiteLLM

In Open WebUI:

```text
Admin Settings
→ Connections
→ OpenAI
→ Add Connection
```

Use:

```text
URL:
http://<litellm-service-name>.railway.internal:4000/v1

API Key:
<LiteLLM virtual key>
```

Expected result:

- Open WebUI verifies the connection.
- Open WebUI model dropdown shows only LiteLLM aliases allowed by the LiteLLM virtual key.
- General users access models only through LiteLLM.

---

## User/customer tracking between Open WebUI and LiteLLM

### Known project behavior

Connection-level custom headers in Open WebUI were not reliable in this Railway setup, even with a static value.

The working path was Open WebUI's global user-info forwarding environment variables.

### Stable UUID tracking

On the Open WebUI Railway service, set:

```bash
ENABLE_FORWARD_USER_INFO_HEADERS=True
FORWARD_USER_INFO_HEADER_USER_ID=x-litellm-customer-id
```

Redeploy Open WebUI.

This sends:

```http
x-litellm-customer-id: <Open WebUI user UUID>
```

LiteLLM tracks this value as a customer ID.

Check usage in:

```text
LiteLLM UI
→ Usage
→ Customer Usage
```

### Human-readable tracking option

If the team needs human-readable LiteLLM customer names directly in the LiteLLM UI, use email instead:

```bash
ENABLE_FORWARD_USER_INFO_HEADERS=True
FORWARD_USER_INFO_HEADER_USER_EMAIL=x-litellm-customer-id
```

Only use one customer-ID mapping mode at a time.

Tradeoff:

```text
UUID tracking:
  + Stable
  + Better for joins and long-term accounting
  - Not readable in LiteLLM UI without mapping

Email tracking:
  + Readable in LiteLLM UI
  + Easy for small internal rollout
  - Email can change
  - Email appears in LiteLLM logs/UI
```

Recommended default:

- Use UUID for governance-grade accounting.
- Use email only if immediate operational readability is more important during rollout.

---

## Mapping LiteLLM customer UUID back to Open WebUI user

When using UUID tracking:

```text
LiteLLM customer_id = Open WebUI user.id
```

Query the Open WebUI Postgres database:

```sql
SELECT
  id,
  username,
  name,
  email,
  role,
  last_active_at,
  created_at,
  updated_at
FROM "user"
ORDER BY email;
```

Use this for a future internal dashboard:

```text
AI Usage Admin
  - Pull LiteLLM customer usage/spend
  - Join customer_id with Open WebUI user.id
  - Show name, email, team, role, requests, spend, and model usage
```

---

## Verification workflow

When troubleshooting Open WebUI ↔ LiteLLM, isolate layers.

### 1. Verify LiteLLM directly

Bypass Open WebUI:

```bash
curl "https://<your-litellm-domain>/v1/chat/completions" \
  -H "Authorization: Bearer <LITELLM_VIRTUAL_KEY_USED_BY_OPENWEBUI>" \
  -H "Content-Type: application/json" \
  -H "x-litellm-customer-id: debug-direct-customer-001" \
  -d '{
    "model": "company-fast",
    "messages": [
      { "role": "user", "content": "Reply with OK." }
    ]
  }'
```

Then check:

```text
LiteLLM UI → Usage → Customer Usage
```

If the debug customer appears, LiteLLM customer tracking works.

### 2. Verify Open WebUI path

Send a real chat in Open WebUI using a LiteLLM-backed model.

Then check:

```text
LiteLLM UI → Usage → Customer Usage
```

If the customer appears, Open WebUI forwarding and LiteLLM tracing are working.

### 3. Common failure points

Check these before changing architecture:

```text
The chat is using a different Open WebUI connection.
The selected model is not routed through LiteLLM.
Open WebUI env vars were changed but the service was not redeployed.
The wrong LiteLLM instance/database is being checked.
LiteLLM UI date range/filter is hiding the request.
The virtual key/model alias is not the one used by Open WebUI.
Connection-level custom headers are not being applied to chat requests in this deployment.
```

---

## Recommended current production baseline

### LiteLLM

```text
Use LiteLLM UI:
  - Store Model in DB enabled
  - Provider credentials in LLM Credentials
  - Model aliases only
  - Model access groups
  - Team: OpenWebUI-General
  - Virtual key: openwebui-general
  - Conservative budget/rate limits during pilot
```

### Open WebUI

```text
Connection:
  Type: OpenAI-compatible
  URL: http://<litellm-service-name>.railway.internal:4000/v1
  API key: LiteLLM virtual key

Env:
  ENABLE_FORWARD_USER_INFO_HEADERS=True
  FORWARD_USER_INFO_HEADER_USER_ID=x-litellm-customer-id
```

Alternative for readable customer names:

```bash
ENABLE_FORWARD_USER_INFO_HEADERS=True
FORWARD_USER_INFO_HEADER_USER_EMAIL=x-litellm-customer-id
```

Use only one mapping mode.

---

## Answering style for this project

When advising on this deployment:

1. Separate actions by surface:
   - Railway env vars
   - LiteLLM UI
   - Open WebUI admin UI
   - Postgres/SQL verification
   - curl/direct API verification
2. Prefer exact paths and snippets over broad explanations.
3. State whether a recommendation is:
   - Already tested in this project
   - Officially documented
   - Version-sensitive and needs verification
   - A proposed future improvement
4. Default to conservative governance:
   - Virtual keys, not master keys
   - Model aliases, not raw provider names
   - Internal Railway networking, not public service URLs, for service-to-service traffic
   - User tracking enabled from day one
   - Gradual rollout by team/function
5. Do not skip cost, abuse, and permission implications when recommending new features.

---

## Next exploration areas

### Open WebUI

Explore these after the gateway baseline is stable:

1. Groups and permissions
   - Team-based access for e-commerce, fulfillment, livestream, managers/admins.
   - Separate model/assistant/tool visibility by group.

2. Assistants and model presets
   - Company general assistant.
   - E-commerce operations assistant.
   - Fulfillment issue triage assistant.
   - Livestream planning/recap assistant.

3. Skills and company instructions
   - Split global company policy from team-specific SOPs.
   - Add examples, escalation rules, and decision boundaries.
   - Keep instructions concise and operational.

4. Knowledge bases
   - SOPs, product docs, fulfillment policies, livestream scripts.
   - Keep static reference material separate from live operational records.

5. Tools and MCP
   - Internal monorepo APIs as MCP servers.
   - Google Sheets bridge for departments that do not yet have apps.
   - Migrate frequently used sheets into structured apps/APIs over time.

### LiteLLM

Explore these after baseline tracing works:

1. Model governance
   - Curated aliases by use case.
   - Hide raw provider model names.
   - Add fallback models for reliability.

2. Budget and rate limit policy
   - Team budgets.
   - Manager/admin higher limits.
   - Pilot budget caps.
   - Expensive-model access by group/key.

3. Spend analytics
   - Per-customer usage.
   - Per-team usage.
   - Per-model spend.
   - Cost by workflow/assistant.

4. Observability
   - Export logs if needed.
   - Track abnormal usage and abuse.
   - Review high-cost conversations.

5. Safety and governance
   - Restrict model access.
   - Use the AI gateway as the policy enforcement point.
   - Add guardrails gradually where operational risk justifies them.

---

## Operating principles

- Open WebUI is the workspace.
- LiteLLM is the gateway/control plane.
- Railway private networking is preferred for service-to-service traffic.
- Open WebUI should use LiteLLM virtual keys, not the LiteLLM master key.
- Staff should see model aliases, not raw provider model names.
- Start with a small set of approved models.
- Track users from day one.
- Use UUID for stable accounting or email for simpler short-term readability.
- Build a mapping/dashboard later for serious governance.
- Treat Google Sheets as an integration source, not the long-term final architecture.
- Add MCP tools gradually after instructions, routing, and spend controls are stable.

---

## Reference links for humans/admins

Use these links when checking the latest official documentation. Always compare against the deployed versions before applying recommendations.

- Open WebUI Skills: https://docs.openwebui.com/features/workspace/skills/
- Open WebUI environment variables: https://docs.openwebui.com/reference/env-configuration/
- Open WebUI OpenAI-compatible provider connections: https://docs.openwebui.com/getting-started/quick-start/connect-a-provider/starting-with-openai-compatible/
- Open WebUI database schema: https://docs.openwebui.com/reference/database-schema/
- Open WebUI MCP/custom headers: https://docs.openwebui.com/features/extensibility/mcp/
- LiteLLM Open WebUI integration: https://docs.litellm.ai/docs/tutorials/openweb_ui
- LiteLLM customers/end-users: https://docs.litellm.ai/docs/proxy/customers
- LiteLLM customer usage: https://docs.litellm.ai/docs/proxy/customer_usage
- LiteLLM Admin UI: https://docs.litellm.ai/docs/proxy/ui
- LiteLLM Store Model in DB: https://docs.litellm.ai/docs/proxy/ui_store_model_db_setting
- LiteLLM LLM credentials UI: https://docs.litellm.ai/docs/proxy/ui_credentials
- LiteLLM virtual keys: https://docs.litellm.ai/docs/proxy/virtual_keys
- LiteLLM budgets/rate limits/users: https://docs.litellm.ai/docs/proxy/users
- LiteLLM model access groups: https://docs.litellm.ai/docs/proxy/model_access_groups
- Railway private networking: https://docs.railway.com/networking/private-networking
