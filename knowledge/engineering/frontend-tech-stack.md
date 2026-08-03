# Frontend Technology Stack Standard

okf_version: "0.2"
type: engineering_standard
status: active
stale_after: "2027-01-01"

## Overview

Canonical technology stack standards for single-page frontend applications (`apps/erify_studios`, `apps/erify_creators`, `apps/eridu_docs`).

## Core Technology Stack

| Layer | Standard | Details |
| --- | --- | --- |
| **Framework** | React 19 (`react@^19.2.0`) | Modern React hooks, StrictMode enabled |
| **Build System** | Vite 7 (`vite@^7.3.6`) | Fast HMR, Rollup production bundling |
| **Styling** | TailwindCSS v4 (`@tailwindcss/vite`) | CSS-first configuration, no legacy tailwind.config.js |
| **Routing** | TanStack Router (`@tanstack/react-router`) | Typed search params, file-based routing, auto code-splitting |
| **Server State** | TanStack Query v5 (`@tanstack/react-query`) | Stale-while-revalidate, IndexedDB offline persistence (`idb-keyval`) |
| **Form Handling** | React Hook Form + Zod | `@hookform/resolvers/zod` for type-safe validation |
| **Localization** | Paraglide JS (`@eridu/i18n`) | Compile-time localized message functions |
| **UI Components** | `@eridu/ui` | Built on Radix primitives and Tailwind v4 |

## Optimization & PWA Rules

1. **Vendor Chunk Isolation**: Production builds must configure custom Rollup `manualChunks` in `vite.config.ts` to separate `vendor-react`, `vendor-tanstack`, `vendor-table`, and `vendor-forms`.
2. **PWA Offline Caching**: Use `vite-plugin-pwa` with Workbox navigation fallbacks (`navigateFallback: '/'`) and isolate `/api` requests as `NetworkOnly`.
3. **Component Sizing**: Keep React components under 200 lines of code. Extract complex form/table state into custom domain hooks (`useXxxState`).
