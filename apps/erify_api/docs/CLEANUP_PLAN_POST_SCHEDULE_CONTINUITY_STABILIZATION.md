# Post-Stabilization Cleanup Plan (Schedule Continuity + GS Integration)

Use this after BE + Google Sheets flows have been stable in production for at least one release window.

## 1. Feature Flags and Legacy Paths
- [ ] Remove `SCHEDULE_PUBLISH_DIFF_UPSERT_ENABLED` legacy toggle path from publish service.
- [ ] Delete old destructive publish logic (`delete + recreate`) once rollback window is closed.
- [ ] Keep only diff+upsert implementation and simplify branching code.
- [ ] Update env docs to remove deprecated flag references.

## 2. API/Contract Consolidation
- [ ] Verify all publish consumers now use envelope response (`schedule`, `publish_summary`).
- [ ] Remove any adapter code supporting old publish response shape.
- [ ] Confirm all show plan payload producers always send `external_id`.
- [ ] Remove temporary compatibility logic that accepted legacy aliases (if any remain).

## 3. Google Sheets Script Cleanup
- [ ] Keep `L` checkbox selector as single scope source of truth.
- [ ] Remove unused config keys tied to old range-driven scope.
- [ ] Keep only minimal config cache hints (`selected_start_row`, `selected_end_row`, `selected_count`) if still useful.
- [ ] Remove dead helper functions/comments that reference active-range batch behavior.
- [ ] Standardize status/note writing columns in one constants block.

## 4. Sheet Structure Cleanup
- [ ] Freeze final column definitions for `schedules`, `show_planning`, `show_planning_integration`.
- [ ] Remove obsolete columns no longer used by scripts (example: temporary error/version helper columns).
- [ ] Lock formula cells in `config` to prevent accidental override.
- [ ] Apply consistent data validation rules (checkboxes, required fields) on active columns.

## 5. Data Hygiene
- [ ] Archive old pre-continuity sheets to backup tabs/folder.
- [ ] Keep only active planning windows in main working sheets.
- [ ] Run one duplicate audit on selected schedules:
  - [ ] duplicate `show_id` within same schedule
  - [ ] duplicate `(client_id, external_id)` collisions in integration data
- [ ] Clear stale status/error notes from rows no longer in active planning scope.

## 6. Test and Verification Hardening
- [ ] Remove/merge temporary test fixtures added during migration window.
- [ ] Keep canonical tests for:
  - [ ] identity-preserving republish
  - [ ] remove -> cancelled / pending-resolution transitions
  - [ ] restore semantics
  - [ ] publish summary correctness
  - [ ] selector-driven per-schedule GS iteration resilience
- [ ] Add a regression checklist for staged dry-run before each major sheet/script update.

## 7. Monitoring and Operational Cleanup
- [ ] Review publish summary metrics and drop no-longer-needed temporary counters.
- [ ] Standardize log fields for update/validate/publish runs.
- [ ] Set alert thresholds for:
  - [ ] validation failure spikes
  - [ ] pending-resolution growth
  - [ ] version mismatch rates
- [ ] Remove temporary verbose logs once baseline is healthy.

## 8. Documentation Cleanup
- [ ] Mark migration-specific docs as historical or archive them.
- [ ] Keep one canonical runbook for planners (update -> validate -> publish using `L=true`).
- [ ] Document final contract rules clearly:
  - [ ] external communication field is `external_id`
  - [ ] internal code may use UID for clarity
- [ ] Update troubleshooting section with common row-level failures and fix steps.

## 9. Change Control / Exit Criteria
- [ ] Stability window passed (agreed duration) with no severe publish regressions.
- [ ] No active consumer depends on deprecated behavior.
- [ ] Rollback plan updated to new steady-state architecture.
- [ ] Cleanup tasks completed and signed off by BE + GS owners.
