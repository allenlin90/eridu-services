# Studio Configuration & Settings

**Status:** Ideation
**Scope:** Design and architecture for studio-scoped settings to replace hardcoded business rules, consolidating three previously separate ideation tracks (operational day window, timezone boundary normalization, and show readiness task gating) into a single unified configuration path.

---

## Context

To support initial deployment, several critical operational, timezone, and task readiness rules are hardcoded in the NestJS backend (`apps/erify_api/`). As the platform scales to support diverse studios (e.g. international regions, custom workflows, varying shifts), these hardcoded rules must move into a unified per-studio configuration settings schema.

This document unifies three previously scattered ideation tracks:
1.  **Configurable Operational Day Window:** Allowing day boundaries to be configurable per studio.
2.  **Timezone Boundary Normalization:** Interpreting date filters consistently using a studio business timezone rather than server host locales.
3.  **Required Task & Moderation Gating:** Gating show readiness based on custom premium show rules and robust moderation task matching.

---

## Hardcoded Configurations & Operational Gaps

### 1. Hardcoded Premium Show Identification
*   **Current Logic:** The backend checks `show.standardName.toLowerCase() === 'premium'`.
*   **The Problem:** Only shows with the exact standard name `"premium"` are evaluated for moderation. If a studio defines other high-priority show types (e.g., `"VIP"`, `"Campaign"`, `"Mega-Sale"`), they cannot be gated without a backend code change.

### 2. Hardcoded / Brittle Moderation Task Gating
*   **Current Logic:**
    ```typescript
    private isModerationTask(task: TaskWithTargets): boolean {
      const moderationPattern = /moderation/i;
      return moderationPattern.test(task.description ?? '') || moderationPattern.test(task.template?.name ?? '');
    }
    ```
*   **The Problem:**
    1.  **Brittle text-matching:** The regex `/moderation/i` fails on `"Moderator Workflow"` templates because the word `"Moderator"` does not contain the substring `"moderation"`. This triggers false alarms in the **Missing required coverage** dashboard card.
    2.  **Localization & renaming risks:** Relying on free-form names or descriptions means renaming a template or localizing it to other languages (e.g. Thai, Chinese) will break readiness gating entirely, as they won't match English keywords.

### 3. Hardcoded Operational Day Boundary
*   **Current Logic:** `ShiftAlignmentService.OPERATIONAL_DAY_START_HOUR_UTC = 6` (06:00 UTC cutoff).
*   **The Problem:** Grouping and aligning shifts and tasks assumes a fixed 6:00 AM UTC day boundary. This does not accommodate international studios operating in different timezones or local shifts that span other midnight boundaries.
*   **Aggregated Endpoint Constraints:** The Show Run Review endpoint (`GET /studios/:studioId/shows/run-review`) aggregates the full show graph for the requested window in memory, capping `date_to - date_from` at **31 days** (`SHOW_RUN_REVIEW_MAX_RANGE_DAYS`). Requests beyond that are rejected with a 400. If configurable windows or longer analytical ranges are needed later, this aggregation must move off the synchronous in-memory path.

### 4. Timezone-Dependent Date Parsing
*   **Current Logic:** Date presets (`this_week`, `this_month`) and explicit date-only filters are parsed using the host system/server local timezone boundary.
*   **The Problem:** Non-deterministic query results across multi-region deployments or if server timezones are modified. Date-only range interpretation is runtime-environment dependent:
    1. If app servers move from UTC+7 to UTC (or mixed regions), the same request payload can produce different DB filter boundaries.
    2. Preset windows are tied to server locale rather than studio timezone.
    3. Mismatches create off-by-hours/day inclusion or exclusion at date boundaries.

### 5. Hardcoded Money / Currency Display Formatting
*   **Current Logic:** Monetary values (e.g. GMV on the `/performance` dashboard) render as raw decimal strings with no currency symbol or grouping.
*   **The Problem:** Surfaced during `/performance` review (PR 21 follow-up [roadmap 21.12](../roadmap/PHASE_4.md)). Money is hard to read without a thousands separator and a currency unit; the operating market is Thailand, so GMV should display in Thai Baht (`฿`/THB) with `th-TH` grouping. The chosen currency and number locale are studio-scoped, so they belong in studio settings (`localization.currency` / `localization.locale`) and flow into a shared formatter used by the dashboard and any other monetary surface. Until the settings model exists, a sensible default (`THB` / `th-TH`) can be applied app-side, but the value must ultimately be configurable per studio.

### 6. Divergent Operational-Day Implementations (Cross-Cutting)
*   **Current Logic:** With no studio timezone field, every operational-day calculation independently guesses the studio's timezone, and they **do not agree**:
    | Surface | How it resolves the timezone | Effective day boundary |
    | --- | --- | --- |
    | `task-report-scope.service.ts` (since PR #205) | client sends the resolved window as explicit ISO instants (`window_start`/`window_end`); BE filters verbatim, no server tz math | 06:00 **client-resolved** (explicit instants) |
    | `studio-performance` + `studio-costs` (`deriveClientOffsetMs`) | offset recovered from a **client-sent** instant; no DST, fixed offset ("brittle by design" per the util's own doc) | 06:00 **client-local** (derived offset) |
    | `ShiftAlignmentService` (`OPERATIONAL_DAY_START_HOUR_UTC = 6`, `getUTCHours()`) | none — hardcoded UTC | 06:00 **UTC** |
*   **The Problem:**
    1.  **Latent correctness bug:** performance/costs bucket shows at 06:00 local (UTC+7 in practice) while shift-alignment buckets at 06:00 UTC — a 7-hour disagreement on which operational day a show belongs to. Today this is masked because all studios are in `Asia/Bangkok`; it diverges the moment a studio is in any other zone, and is already incorrect for any non-browser caller (scheduled exports, server jobs).
    2.  **Client-clock dependence:** all three approaches ultimately tie a **studio-intrinsic** window to whoever is *viewing* it (the browser's clock). The operational day is a property of the studio's physical location, not the viewer's device — so a traveling manager, a cross-border VA, or any headless caller produces wrong windows. PR #205's explicit-instant contract is the cleanest of the three (no server-side tz math, no offset derivation) and is a good reference shape for the eventual server-authoritative util, but it is still viewer-clock-driven.
*   **Concrete instance — task report metrics (PR #205, June 2026):** midnight shows starting before 06:00 were displayed on the performance dashboard but excluded from task reports, because the report builder clamped to `00:00–23:59` calendar days instead of the `06:00→05:59` operational window. PR #205 fixed this by having the FE send the operational-day window as explicit ISO instants and deleting the BE's server-local `new Date(\`${dateStr}T00:00:00\`)` string-munging entirely. This removed the worst (server-host-locale) variant, but the window is still resolved from the viewer's browser clock — the studio-timezone-as-config target below is what makes it authoritative.
*   **Target:** a single `StudioSettings.planning.{timezone, operationalDayStartHour}` consumed by **one** shared BE timezone-boundary utility (proper IANA conversion, not naive `setHours`), retiring `deriveClientOffsetMs`, `ShiftAlignmentService.OPERATIONAL_DAY_START_HOUR_UTC`, and the client-supplied `window_start`/`window_end` contract in favor of server-authoritative resolution.

### 7. Mechanic Requirement Enforcement (Future)

*   **Current Logic:** PR 20.6's coverage resolver (`ClientMechanicService.getMechanicCoverage` / `getShowMechanicsCoverage`) is **purely observational** — it reports whether a mechanic already assigned into a template's Loop×Mechanic matrix (PR 20.5) is reaching its target shows current/stale/dropped/unassigned. It is not wired into task-completion, show-lifecycle, or task-orchestration code anywhere; a show can reach `COMPLETED` regardless of what the coverage view reports. There is no concept anywhere in the codebase of "which mechanics a given show is required to carry" — coverage can only report against whatever a template author already assigned, never against an independent requirement.
*   **The Problem:** Product wants the option to make mechanic presence a precondition for some shows (e.g. "this client's premium shows must always carry mechanic X"), but mechanic requirements are expected to be dynamic per show/client rather than a fixed global rule, and there is currently no standard for what's required at all. Hard-blocking on an undefined or studio-specific requirement would hamper livestream operations the moment a studio's actual workflow doesn't match the hardcoded assumption — the same failure mode items 1–2 above already describe for show-readiness gating.
*   **Proposed shape (sketch, not designed):** extend `readiness.showStandardRequirements` (item 2 below) with an optional `requiredMechanicIds: string[]` per show-standard entry, and gate enforcement behind a new `readiness.enforceMechanicRequirements: boolean` studio setting (default `false`). When the toggle is off (the only state until this is designed and built), mechanic coverage stays informational-only, exactly as it ships in PR 20.6/20.7. When a studio opts in, the same settings UI that would manage `showStandardRequirements` must also expose the mechanic-requirements config — enforcement and its configuration surface ship together, never enforcement alone.
*   **Open questions for the eventual design pass:** where enforcement actually blocks (task submission? show `COMPLETED` transition? both?), whether requirements are per-show-standard or per-client (mechanics are client-owned, not studio-owned — see [`CLIENT_MECHANICS_MANAGEMENT.md`](../../apps/erify_studios/docs/CLIENT_MECHANICS_MANAGEMENT.md)), and how an account manager's sign-off/requirement request (today an out-of-band conversation) should flow into this config instead of staying tribal knowledge.

---

### 8. Lifecycle Gate Enforcement Levels (Deferred from Phase 5 Item 19)

*   **Current Logic:** Phase 5 item 19 (lifecycle state-gate enforcement) ships **warning-level only with hardcoded defaults**: the shared readiness/completion condition contract (Phase 5 items 11/12) renders as advisory warnings on the item 18 transition surfaces, and no transition is ever blocked. The state machine itself (item 18) carries only minimal intrinsic requirements — a valid transition edge, a permitted role, and a reason where the transition class requires one.
*   **The Problem:** Whether a missing condition should *block* a transition is inherently studio policy, not platform truth. Association records regularly complete late in real operations — creator mapping often lands after the moment a manager needs to confirm a show — so a hardcoded `block` level would freeze daily workflow the moment a studio's actual sequence doesn't match the assumption (the same failure mode items 1–2 and 7 describe for readiness gating).
*   **Deferred configuration scope (owned here, promoted on demand):**
    *   per-studio enforcement level per condition (`off` / `warning` / `block`) over the shared condition schema from Phase 5 items 11/12;
    *   required-condition selection (which planning/completion conditions a studio actually cares about);
    *   waiver/override flows for `block`-level conditions, with audit reason;
    *   any grace-period semantics for late-arriving records (e.g. creator mapping, imported performance facts).
*   **Constraint:** `block` must remain per-studio opt-in configuration, never default behavior. Enforcement and its configuration surface ship together, never enforcement alone (same rule as §7).

---

## Proposed Unified Solution: Studio Settings Schema

Introduce a structured JSONB `settings` field inside the `Studio` model in `schema.prisma`.

### 1. Database Schema Extension
```prisma
// Proposed add-on to Studio model in apps/erify_api/prisma/schema.prisma
model Studio {
  // Existing fields...
  settings Json @default("{}") // Structured settings envelope
}
```

### 2. Structured Settings Object Shape
```typescript
interface StudioSettings {
  planning: {
    // Canonical timezone for date presets and boundary calculations
    timezone: string; // e.g. "Asia/Bangkok" (default: "UTC")

    // Configurable day cutoff hour (local to studio timezone)
    operationalDayStartHour: number; // default: 6

    // Default date range (in days) to load on dashboards (Performance, Costs) on first load
    defaultDashboardRangeDays: number; // default: 7
  };
  readiness: {
    // Configurable baseline assignment requirements per show standard (e.g., 'bau', 'premium')
    // Tells exactly what task assignments a show needs to be counted as fully complete and ready.
    showStandardRequirements: {
      [standardName: string]: {
        // Required task types that must be present and assigned (e.g., SETUP, CLOSURE)
        requiredTaskTypes: ('SETUP' | 'ACTIVE' | 'CLOSURE' | 'ADMIN')[];
        // If true, requires at least one active, loop-based (moderation) task assigned to the show
        requireActiveLoopTask: boolean;
      }
    };

    // Configurable matching criteria to identify moderation tasks
    moderationTaskPatterns: {
      regex: string; // default: "moderation|moderator"
      caseInsensitive: boolean; // default: true

      // Structural heuristics (prioritized over brittle name checking)
      checkLoops: boolean; // default: true (loop-based templates are moderation-first)
      checkPlatformViolationBinding: boolean; // default: true (contains fields bound to platform violations)
    };
  };
  localization: {
    // BCP-47 locale used for number / currency formatting in studio UIs
    locale: string; // e.g. "th-TH" (default: "en-US")
    // ISO-4217 currency for monetary display (GMV, compensation totals, etc.)
    currency: string; // e.g. "THB" (default: "THB")
  };
}
```

### 3. Refactored Gating & Normalization (`ShiftAlignmentService`)
Refactor the alignment and task checks to fetch and apply these configurations:
```typescript
const settings = (studio.settings as unknown as StudioSettings) || DEFAULT_STUDIO_SETTINGS;

// 1. Resolve date boundaries using configured timezone and operational cutoff
const timezone = settings.planning.timezone;
const cutoffHour = settings.planning.operationalDayStartHour;
// (Calculations move to centralized timezone-boundary utilities)

// 2. Resolve required task types and moderation checks dynamically based on show standard.
// This allows the studio setting to explicitly dictate what assignments a bau/premium show
// needs in order to be counted as fully complete and ready.
const standardName = show.standardName.toLowerCase();
const standardConfig = settings.readiness.showStandardRequirements[standardName]
  || settings.readiness.showStandardRequirements['default']
  || { requiredTaskTypes: ['SETUP', 'CLOSURE'], requireActiveLoopTask: false };

const requiredTaskTypes = standardConfig.requiredTaskTypes;
const requiresModeration = standardConfig.requireActiveLoopTask;

// 3. Match moderation tasks dynamically and structurally
const moderationPattern = new RegExp(
  settings.readiness.moderationTaskPatterns.regex,
  settings.readiness.moderationTaskPatterns.caseInsensitive ? 'i' : ''
);

const hasModerationTask = tasks.some(task => {
  const schema = task.template?.currentSchema as any;
  if (!schema) return false;

  // 3a. Structural Heuristic: Check if template has loops defined in metadata
  if (settings.readiness.moderationTaskPatterns.checkLoops && schema.metadata?.loops?.length > 0) {
    return true;
  }

  // 3b. Structural Heuristic: Check if any schema field binds to the platform violation system fact
  if (settings.readiness.moderationTaskPatterns.checkPlatformViolationBinding) {
    const items = schema.items || [];
    const hasViolationBinding = items.some((item: any) => item.system_fact_key === 'show_platform_violation');
    if (hasViolationBinding) return true;
  }

  // 3c. Text Fallback: Name / Description regex match
  return (
    moderationPattern.test(task.description ?? '') ||
    moderationPattern.test(task.template?.name ?? '')
  );
});
```

---

## Impacted Surfaces

*   **Prisma Schema:** `Studio` table receives a new `settings Json` column with a migration.
*   **Backend Orchestration:**
    *   `ShiftAlignmentService` refactored to consume `StudioSettings`.
    *   `task-report-scope.service.ts` refactored to normalize boundaries using studio timezone.
*   **Frontend Routing & UI Pages:**
    *   `/studios/:studioId/performance` (Performance dashboard loads date ranges from settings)
    *   `/studios/:studioId/costs` (Costs dashboard loads date ranges from settings)
    *   `/studios/:studioId/task-review`
    *   `/studios/:studioId/show-run-review`
    *   `/studios/:studioId/task-setup`
    *   Studio dashboard operational-day cards.
*   **Studio Settings UI:** A new settings page/tab in `erify_studios` (`/studios/:studioId/settings`) for authorized administrators to adjust operational day boundaries, timezones, default range days, premium show standard qualifiers, and moderation task regexes.

---

## Triggering Conditions for Promotion

This consolidated topic should be promoted to a PRD and scheduled for execution when:
1.  **High-severity False Positives:** The false alarms on the task readiness panel (e.g. missing moderation for `"Moderator Workflow"` tasks) cause significant user confusion.
2.  **Multi-Region Onboarding:** A new studio is onboarded that does not use English text in templates (making `/moderation/i` useless) or requires a different operational day start hour or local timezone.
3.  **Studio Settings Dashboard Epic:** The product roadmap schedules a general **Studio Settings and Preferences UI** phase.
4.  **Operational-day drift becomes user-visible:** surfaces disagree on the same window (e.g. PR #205's report-vs-dashboard mismatch), or the performance-vs-shift-alignment boundary disagreement (gap §6) produces a wrong-day bucket in production. Each interim per-surface patch raises the cost of *not* unifying on a studio timezone.
5.  **Mechanic enforcement requested (§7):** product defines a concrete standard for "which mechanics a show requires" (even for one client/show-standard), or repeated account-manager sign-off requests for the same client signal the manual conversation should become configuration.
6.  **Hard lifecycle gates requested (§8):** a studio operationally needs `block`-level transition enforcement after Phase 5 item 19's warning-only delivery, or repeated transition-warning overrides signal that per-studio condition configuration is due.

---

## Out of Scope for MVP

*   User-level preference UI (settings are studio-level, not personal manager display preferences).
*   Historical regrouping or backfill of already reviewed operational ranges.
*   Timezone migration for stored timestamps; persisted timestamps remain UTC instants.
