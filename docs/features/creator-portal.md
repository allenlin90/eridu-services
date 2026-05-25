# Feature: Creator Portal & Personal Compensations

> **Status**: ✅ Shipped — Phase 4
> **Workstream**: Creator Operations & Talent Autonomy
> **Canonical docs**: [Creator Portal Foundation](../../apps/erify_creators/docs/CREATOR_PORTAL_FOUNDATION.md), [PWA Shell Runbook](../../apps/erify_creators/docs/PWA_SHELL_RUNBOOK.md)

## Problem

Content creators working across multiple studios had no self-service way to check their upcoming schedules or review their show-based compensation, commissions, and adjustments in real-time. Talent managers had to manually communicate rates, verify attendance, and resolve disputes via external spreadsheets and messages. This created significant communication overhead, increased payment error rates, and left the business without a clear, auditable trail of payment transparently shared with creators.

## Users

| Role | Need |
| --- | --- |
| **Content Creator** | Securely check assigned shows, switch between active studio contexts, and review compensation breakdowns (base rates, commission splits, and adjustments) in real-time. |
| **Studio Admin / Manager** | Reduce operational support load by giving rostered creators direct, transparent access to their performance records and finalized compensation summaries. |

## What Was Delivered

### 1. Dedicated Creator Portal App (`erify_creators`)
- Built a completely isolated, secure, and fast React SPA tailored specifically for creators, sharing the same core visual aesthetics and tokenized system as `erify_studios`.

### 2. Onboarding Fallback Guards
- Integrated session-level validation guards inside the root layout (`__root.tsx`) to handle onboarding exceptions with high-fidelity, polished layouts:
  - **Unlinked Account**: Greets users whose accounts are not connected to a global `Creator` profile with the `UnlinkedCreatorView`.
  - **Pending Studio Verification**: Displays the `NoStudioAssociationView` to creators who are linked globally but have no active memberships on any studio rosters.

### 3. Active Studio Switcher
- Designed a Radix-based context switcher mounted in the sidebar layout header. Creators working across multiple studios can instantly swap active contexts, updating all backend queries and caches immediately.

### 4. My Compensations Dashboard
- Created a premium `/compensations` route displaying show-based payment statistics:
  - **Summary Row**: Beautiful slate-indigo glowing cards for **Total Earnings**, **Shows Completed**, and **Pending Items** (shows awaiting agreement or revenue verification).
  - **URL-Synced Date Range Picker**: Synchronization of filter windows (defaulting to the last 30 calendar days) using `@tanstack/react-router` search parameters.
  - **Dense Breakdown Grid**: Lists show name, date/time, compensation type (`FIXED` / `COMMISSION` / `HYBRID`), agreed rates, commission cuts, base amounts, manual adjustments, notes, and resolution statuses.

### 5. PWA Shell & Settings Recovery
- Implemented robust Progressive Web App support to survive network drops:
  - **Periodic Background SW Checks**: Service worker sweeps for updates periodically every 5 minutes using `vite-plugin-pwa` in `prompt` mode, protected against refresh loops on iOS standalone devices.
  - **Destructive Reset App Shell Recovery**: Mounted a `/settings` route with a deep reset recovery tool that unregisters service workers, purges Cache Storage, clears the IndexedDB TanStack Query persist cache, and performs a clean reload of the application to recover from corrupt assets or stale state.

## Key Product Decisions

- **Direct Self-View Isolation**: Instead of packing the creator self-view as a `/me` dashboard nested inside the manager-focused `erify_studios` application, it was built as an entirely distinct codebase. This ensures strict bundle isolation, keeps routing simple and top-level (`/shows`, `/compensations`), and guarantees absolute domain segregation.
- **Zero Local Currency Math**: To eliminate any risk of rounding drift, all currency, adjustment totals, and commission calculations are computed exclusively on the backend (`erify_api`) and served as finalized decimal strings, preserving local display rendering only.
- **Zero Feature-Specific Translation Bundles**: Strictly aligned with `erify_studios` design constraints by removing all local translations (`th.json`, `zh-TW.json`) and keeping `en.json` stripped of local features. User-facing strings and metrics labels are kept inline as plain English literals.

## Acceptance Record

- [x] User profile `/me` endpoints carry nested creator linkage detail.
- [x] Fallback guards intercept unlinked and inactive creator accounts.
- [x] Active Studio Switcher filters queries and updates navigation links.
- [x] Date-range filters synchronize with TanStack Router URL search parameters.
- [x] Partially selected ranges buffer query triggers until complete dates are selected.
- [x] My Compensations dashboard renders summary calculations and a dense breakdown grid.
- [x] PWA Shell handles periodic background update prompts.
- [x] Settings recovery page successfully unregisters active cache, storage, and reloads SPA.
