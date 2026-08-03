---
okf_version: "0.2"
type: bundle_index
title: Eridu Services Knowledge Bundle
description: Canonical Open Knowledge Format bundle for eridu-services architecture, engineering, and domain doctrine.
status: stable
stale_after: "2027-01-01"
---

# Eridu Services Knowledge Bundle

Canonical Open Knowledge Format (OKF v0.2) bundle for `eridu-services`. Durable facts, domain concepts, architecture doctrine, and technology standards live here. Invocable procedures live in [`.agents/skills/`](../.agents/skills/) and select the concepts below.

Read [`docs/engineering/OKF_AGENT_CONTRACT.md`](../docs/engineering/OKF_AGENT_CONTRACT.md) before materially changing any concept in this bundle.

## Discovery

Start here, follow the link for the concept you need, and open only that file. Do not load the whole bundle. The portable concept ID is the bundle-relative path without `.md` — for example `architecture/database-patterns`.

## Knowledge Architecture

```mermaid
graph TD
    Root["knowledge/ (OKF v0.2 bundle root)"]

    Root --> Eng["engineering/ — technology standards"]
    Root --> Arch["architecture/ — layer and design doctrine"]
    Root --> Dom["domain/ — business domain models"]

    Eng --> FE["frontend-tech-stack"]
    Eng --> PWA["pwa-best-practices"]
    Eng --> Table["table-view-pattern"]

    Arch --> Pattern["design-patterns"]
    Arch --> Service["service-pattern-nestjs"]
    Arch --> Controller["backend-controller-pattern-nestjs"]
    Arch --> DB["database-patterns"]

    Dom --> Show["show-production-lifecycle"]
```

## Concepts

### Architecture

- [`architecture/design-patterns`](architecture/design-patterns.md) — Architectural layers, OLTP-vs-analytical boundaries, REST route shape, module exports, and monorepo package organization.
- [`architecture/service-pattern-nestjs`](architecture/service-pattern-nestjs.md) — Capability and model service boundaries, ORM decoupling rules, and error handling by service type.
- [`architecture/backend-controller-pattern-nestjs`](architecture/backend-controller-pattern-nestjs.md) — Controller types, guard ordering, response decorators, and UID validation.
- [`architecture/database-patterns`](architecture/database-patterns.md) — Soft delete, transactions, optimistic locking, advisory locks, polymorphism, audit history, and migration policy.

### Engineering

- [`engineering/frontend-tech-stack`](engineering/frontend-tech-stack.md) — React 19, Vite, Tailwind v4, TanStack Router and Query, and project structure standards.
- [`engineering/pwa-best-practices`](engineering/pwa-best-practices.md) — Service worker segregation, double-caching anti-pattern, iOS pitfalls, and CDN cache-poisoning prevention.
- [`engineering/table-view-pattern`](engineering/table-view-pattern.md) — Server-driven tables, URL state, pagination review gate, row selection, and current-view export.

### Domain

- [`domain/show-production-lifecycle`](domain/show-production-lifecycle.md) — Livestream Show state machine, entity relationships, lifecycle phases, readiness conditions, and operating roles.
