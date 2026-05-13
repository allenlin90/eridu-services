# Tech Debt

Known implementation gaps and cleanup issues that should be fixed, but are not product ideation topics.

Use this register for accepted risk, consistency gaps, migration cleanup, and refactor debt. Use [ideation](../ideation/README.md) for new product or architecture ideas that need discovery, decision gates, or PRD promotion.

## Lifecycle

1. Create a tech-debt doc when a review accepts an issue as follow-up instead of blocking the current PR.
2. Keep each entry concrete: affected surface, current behavior, desired behavior, risk, and trigger to fix.
3. Link from PR descriptions or review notes when a known issue is intentionally deferred.
4. When fixed, update or delete the entry in the same PR that resolves it.

## Active Issues

| Issue | Area | Trigger To Fix | Related Context |
| --- | --- | --- | --- |
| [Admin Route Business Logic Bypass](./admin-route-business-logic-bypass.md) | `erify_api` admin mutations | Any admin mutation touches finance, assignment snapshots, actuals, lifecycle transitions, or cross-domain side effects | [Compensation Line Items](../prd/compensation-line-items.md), [Economics Service](../prd/economics-service.md) |
