# LiteLLM Policy Scaffold

This directory contains templates for LiteLLM model routing, budget tiers, and customer synchronization.

## Intended production pattern

```text
Open WebUI
  -> one LiteLLM virtual key
  -> forwards Open WebUI user identity per request

LiteLLM
  -> maps forwarded identity to a customer/end user
  -> applies customer budget, RPM, and TPM limits
  -> routes requests to provider deployments through stable model aliases
```

## Files

| File | Purpose |
|---|---|
| `budget-tiers.example.json` | Example budget and rate-limit tiers for users. |
| `customer-sync.example.json` | Example role-to-budget mapping for syncing Better Auth users into LiteLLM customers. |
| `model-groups.example.yaml` | Example LiteLLM router config for Railway or repo-managed deployment. |

## Railway guidance

For pilots, the LiteLLM UI is useful for keys, spend visibility, and model checks. For stable routing and governance, prefer repo-managed config or config generated from Railway environment variables.

Provider API keys should stay in Railway environment variables. Do not commit real provider keys.
