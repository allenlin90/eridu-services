# Railway LiteLLM Rate Limiting

This guide documents how to run LiteLLM on Railway with config stored in a Railway service variable and written to `config.yaml` before startup.

## Files

- `ai/litellm/railway-rate-limit-config.example.yaml` — config template to copy into Railway variable `LITELLM_CONFIG_YAML`.

## Railway variables

Required variables:

```text
LITELLM_CONFIG_YAML=<full YAML content>
LITELLM_MASTER_KEY=sk-...
DATABASE_URL=postgresql://...
REDIS_HOST=...
REDIS_PORT=...
REDIS_PASSWORD=...
GEMINI_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
```

Only keep provider keys in Railway variables. Do not commit real keys.

## Prestart / start command

Use a Railway start command that writes the config file before launching LiteLLM:

```bash
sh -c 'printf "%s" "$LITELLM_CONFIG_YAML" > /app/config.yaml && litellm --config /app/config.yaml --host 0.0.0.0 --port ${PORT:-4000}'
```

If the image cannot write to `/app`, use `/tmp/config.yaml` instead:

```bash
sh -c 'printf "%s" "$LITELLM_CONFIG_YAML" > /tmp/config.yaml && litellm --config /tmp/config.yaml --host 0.0.0.0 --port ${PORT:-4000}'
```

## What the config enforces

### 1. Deployment-level RPM / TPM

Each `model_list` entry has `rpm` and `tpm` under `litellm_params`. These are deployment-level provider limits. The router uses them with Redis and `enable_pre_call_check: true` to avoid choosing an exhausted deployment before a call.

### 2. Per-customer default rate limit

The config references:

```yaml
litellm_settings:
  max_end_user_budget_id: openwebui-default-user
```

This does not create the budget by itself. Create the budget after LiteLLM boots:

```bash
curl -X POST "$LITELLM_URL/budget/new" \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "openwebui-default-user",
    "max_budget": 10,
    "rpm_limit": 20,
    "tpm_limit": 50000
  }'
```

This applies to customers/end-users without an explicit budget. Customers with their own `budget_id` are unaffected.

### 3. Open WebUI user tracking

LiteLLM must receive the Open WebUI user identity on each request. Preferred headers:

```http
x-litellm-customer-id: user@example.com
```

or:

```http
x-litellm-end-user-id: user@example.com
```

The OpenAI-compatible request body field also works:

```json
{ "user": "user@example.com" }
```

If Open WebUI sends a different custom header, uncomment `general_settings.user_header_mappings` in the YAML and map that header to the `customer` role.

## Validation steps

Set local shell helpers:

```bash
export LITELLM_URL="https://your-litellm-service.up.railway.app"
export LITELLM_MASTER_KEY="sk-..."
export OPENWEBUI_TEST_USER="test.user@example.com"
```

### 1. Confirm config loaded

```bash
curl -s "$LITELLM_URL/model/info" \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" | jq
```

Expected:

- `company-auto-balanced` appears more than once if multiple provider deployments are configured under the same model group.
- `company-auto-cheap` appears.
- `company-auto-strong` appears.

### 2. Create the default budget

Run the `/budget/new` command above. If it already exists, use the LiteLLM UI or API to confirm the budget ID and limits.

### 3. Send a request with customer identity

```bash
curl -s "$LITELLM_URL/v1/chat/completions" \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -H "x-litellm-customer-id: $OPENWEBUI_TEST_USER" \
  -d '{
    "model": "company-auto-balanced",
    "messages": [{"role": "user", "content": "Reply with one short sentence."}]
  }' | jq
```

Expected:

- Response succeeds.
- LiteLLM logs show the selected provider deployment.
- Customer spend is tracked for `$OPENWEBUI_TEST_USER`.

### 4. Confirm customer spend tracking

```bash
curl -s "$LITELLM_URL/customer/info?end_user_id=$OPENWEBUI_TEST_USER" \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" | jq
```

Expected:

- `user_id` equals the test email.
- `spend` is greater than or equal to `0`.
- Budget info is present after the customer is associated with a budget or default budget applies.

### 5. Validate per-customer RPM limit

Temporarily create a very small test budget:

```bash
curl -X POST "$LITELLM_URL/budget/new" \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "openwebui-test-rpm-1",
    "max_budget": 10,
    "rpm_limit": 1,
    "tpm_limit": 50000
  }'
```

Assign it to the test customer:

```bash
curl -X POST "$LITELLM_URL/customer/new" \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\": \"$OPENWEBUI_TEST_USER\", \"budget_id\": \"openwebui-test-rpm-1\"}"
```

Send two requests within one minute using the same customer header. The second request should be rate limited.

### 6. Validate Open WebUI integration

From Open WebUI:

1. Select the LiteLLM model alias, for example `company-auto-balanced`.
2. Send a short prompt as a real Open WebUI user.
3. In LiteLLM, check `/customer/info?end_user_id=<that user's email>`.

If spend does not show under that email, Open WebUI is not forwarding a recognized customer identity. Check whether the request uses `x-litellm-customer-id`, `x-litellm-end-user-id`, request body `user`, or a custom header mapping.

## Common failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| Models do not appear | Config did not load | Check Railway start command and generated config path. |
| All Open WebUI usage is under one key | User identity is not forwarded | Send `x-litellm-customer-id`, `x-litellm-end-user-id`, or request body `user`. |
| Default budget does not apply | Budget ID does not exist | Create `openwebui-default-user` through `/budget/new`. |
| Provider still receives too many calls | Deployment RPM/TPM too high or Redis not connected | Lower deployment limits and verify Redis env vars. |
| Custom header ignored | Header mapping missing | Add `general_settings.user_header_mappings`. |
