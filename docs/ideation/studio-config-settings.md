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
    *   `/studios/:studioId/task-review`
    *   `/studios/:studioId/show-run-review`
    *   `/studios/:studioId/task-setup`
    *   Studio dashboard operational-day cards.
*   **Studio Settings UI:** A new settings page/tab in `erify_studios` (`/studios/:studioId/settings`) for authorized administrators to adjust operational day boundaries, timezones, premium show standard qualifiers, and moderation task regexes.

---

## Triggering Conditions for Promotion

This consolidated topic should be promoted to a PRD and scheduled for execution when:
1.  **High-severity False Positives:** The false alarms on the task readiness panel (e.g. missing moderation for `"Moderator Workflow"` tasks) cause significant user confusion.
2.  **Multi-Region Onboarding:** A new studio is onboarded that does not use English text in templates (making `/moderation/i` useless) or requires a different operational day start hour or local timezone.
3.  **Studio Settings Dashboard Epic:** The product roadmap schedules a general **Studio Settings and Preferences UI** phase.

---

## Out of Scope for MVP

*   User-level preference UI (settings are studio-level, not personal manager display preferences).
*   Historical regrouping or backfill of already reviewed operational ranges.
*   Timezone migration for stored timestamps; persisted timestamps remain UTC instants.
