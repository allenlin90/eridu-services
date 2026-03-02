# Data Warehouse Design (Datastream + BigQuery)

> **Status**: ⏳ **To be written** — This design doc is a Phase 4 deliverable.

## Scope

This document should cover:

1. **Datastream CDC Configuration**: PostgreSQL → BigQuery replication setup, which tables to stream, change tracking mode (CDC vs full mirror), latency targets
2. **BigQuery Dataset Design**: Table schemas, partitioning strategy (by date), clustering keys, data retention policies
3. **Data Model Mapping**: How erify_api Prisma models map to BigQuery tables (snake_case columns, BigInt → INT64, Json → JSON/STRING, soft deletes)
4. **BI Layer**: Dashboard tool selection (Looker, Metabase, or equivalent), key dashboards and KPIs:
   - Review throughput and rejection patterns
   - Task completion rates, operator performance, bottleneck identification
   - Show scheduling efficiency, studio utilization
   - Shift cost analysis and billing insights
5. **Access Control**: Who can query BigQuery directly vs. who uses dashboards only. Role-based dashboard access aligned with studio membership roles.
6. **Infrastructure**: GCP project setup, Datastream service account permissions, BigQuery API quotas, cost estimation
7. **Migration from In-App Analytics**: Supersedes the `TaskAnalyticsSnapshot` model approach (see [superseded design](./ANALYTICS_DASHBOARD.md))

## Reference

- **[Phase 4 Roadmap](../roadmap/PHASE_4.md)** — Implementation scope and success criteria
- **[Analytics Dashboard (Superseded)](./ANALYTICS_DASHBOARD.md)** — Original in-app analytics approach (retained for reference)
- **[Architecture Overview](../ARCHITECTURE_OVERVIEW.md)** — System architecture
