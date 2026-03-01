# GS + Apps Script Upgrade Checklist (Selector-Driven Schedule Processing)

## A. schedules Sheet
- [x] Confirm column `L` is the schedule selector (`active_schedule`).
- [x] Apply checkbox data validation on `L2:L` (boolean `TRUE`/`FALSE`, not text).
- [x] Ensure every selectable row has `schedule_id` in column `B`.
- [x] Before each run, clear old selections and check only target schedules.

## B. show_planning Sheet
- [x] Ensure `show_id` (column `C`) is present for every row to be processed.
- [x] Ensure required fields are present:
  - [x] `schedule_id` (B)
  - [x] `show_id` (C)
  - [x] `date` (D)
  - [x] `start_time` (E)
  - [x] `end_time` (F)
  - [x] `client` (G)
- [x] Keep labels/values consistent so integration mapping is deterministic.

## C. show_planning_integration Sheet
- [x] Confirm transformed rows exist for selected schedules.
- [x] Confirm `show_id` is preserved (used as `external_id` in payload).
- [x] Confirm `client` is UID format (`client_*`).
- [x] Confirm platform IDs are UID format (`plt_*`) or map correctly from names.

## D. Column Alignment Check
- [x] Verify status/error columns in `show_planning` match Apps Script constants.
- [ ] If `error_on_version` exists before status, align either by:
  - [x] updating Apps Script column constants, or
  - [ ] moving/removing columns so status/error land in expected positions.

## E. config Sheet (Cache Hints)
- [x] Set `J4` to `selected_start_row` (cache).
- [x] Set `J6` to `selected_end_row` (cache).
- [x] Set `J8` to `selected_count` (optional cache).
- [x] Put formulas:
  - [x] `J4`: `=ARRAYFORMULA(MIN(IF(schedules!L2:L=TRUE,ROW(schedules!L2:L))))`
  - [x] `J6`: `=ARRAYFORMULA(MAX(IF(schedules!L2:L=TRUE,ROW(schedules!L2:L))))`
  - [x] `J8`: `=COUNTIF(schedules!L2:L,TRUE)`
- [ ] If sheet locale uses semicolon separators, replace `,` with `;`.
- [x] Remove/deprecate old `active_schedule_range` meaning in config notes (Apps Script no longer reads range strings).
- [x] Keep these as performance hints only; source of truth remains `schedules!L = TRUE`.

## F. Apps Script Behavior
- [x] `update` reads only selected schedules (`L=TRUE`).
- [x] `validate` reads only selected schedules (`L=TRUE`).
- [x] `publish` reads only selected schedules (`L=TRUE`).
- [x] All three process per schedule and continue on failures (no whole-batch abort).
- [x] Update payload sends `external_id` from `show_id`.

## G. Dry Run (Staging)
1. [ ] Select 2-3 schedules (`L=TRUE`).
2. [ ] Run update and verify only selected schedules are touched.
3. [ ] Run validate and verify only selected schedules transition.
4. [ ] Run publish and verify only selected schedules publish.
5. [ ] Add one intentionally bad schedule and rerun.
6. [ ] Verify failures are isolated and remaining selected schedules still run.

## H. Rollout Operations
- [ ] Decide whether successful schedules should auto-uncheck `L`.
- [ ] Keep row-level notes/errors visible for fast retries.
- [ ] Leave historical schedules untouched unless selected.
- [ ] Tag/freeze the Apps Script version before production rollout.
