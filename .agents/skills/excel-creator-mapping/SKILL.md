---
name: excel-creator-mapping
description: Map creators from Excel schedules to database shows. Use spreadsheet for workbook-only editing or analysis.
---

# Excel Creator Mapping

Allows importing show-to-creator mappings from external Excel schedule spreadsheets into the local or production database.

## Quick start

To run a dry-run check against the local database:
```bash
python3 scripts/map-excel-creators.py --dry-run
```

To run and apply updates to the production database:
```bash
python3 scripts/map-excel-creators.py --prod
```

## Workflows

1. **Verify Spreadsheet Structure**: Ensure the spreadsheet has the column `UID / Show ID` mapping to shows (matches `external_id`, `name`, or `uid` in DB) and columns `MC 1`, `MC 2`, `MC 3` for assigned creators.
2. **Review Name Overrides**: Check `NAME_OVERRIDES` in the script to align spelling or nickname variations between Excel names and DB `alias_name`/`name`.
3. **Execute Dry-run**: Run with `--dry-run` to output analysis results without modifying the database. Ensure unmatched lists are empty:
   ```bash
   python3 scripts/map-excel-creators.py --dry-run
   ```
4. **Sync Local DB**: Apply updates locally first:
   ```bash
   python3 scripts/map-excel-creators.py
   ```
5. **Sync Production DB**: Once local validation passes, deploy to production:
   ```bash
   python3 scripts/map-excel-creators.py --prod
   ```
