# Sheets Templates (Sanitized)

These CSV files are sanitized templates for Google Sheets layout/reference.

## Purpose
- Provide non-sensitive examples for column layout and script behavior.
- Document required fields for update/validate/publish flow.

## Files
- `config.template.csv`: configuration keys and cache-hint rows.
- `schedules.template.csv`: schedule-level metadata + `active_schedule` selector in column `L`.
- `show_planning.template.csv`: planner-facing rows.
- `show_planning_integration.template.csv`: UID/transformed rows used by Apps Script update flow.

## Sensitive Data Policy
- Do not commit real exports in `sheets/*.csv`.
- Real exports should stay local and remain untracked by git.
- Only sanitized templates under `sheets/templates/` should be committed.

## Required Fields for Processing
- Schedule selection scope: `schedules.active_schedule = TRUE`.
- Required show fields:
  - `schedule_id`
  - `show_id` (used as `external_id`)
  - `date`
  - `start_time`
  - `end_time`
  - `client`

## Notes
- Column alignment must match Apps Script constants.
- Template values are examples only; replace with real values at runtime in the live sheet.
