---
name: spreadsheet
description: Create, edit, analyze, or format xlsx, csv, and tsv files. Not for database creator mapping.
---

# Spreadsheet Skill

## Workflow

1. Confirm file type and goal: create, edit, analyze, or visualize
2. Use `openpyxl` for `.xlsx`, `pandas` for analysis/CSV/TSV
3. Recalculate formulas and render sheets before delivery when possible
4. Use formulas for derived values (never hardcode results)
5. Save to `output/spreadsheet/`, temp files to `tmp/spreadsheets/`

## Dependencies

```bash
uv pip install openpyxl pandas          # or pip install
brew install libreoffice poppler        # for rendering (macOS)
```

## Formula Rules

- Formulas for derived values, not hardcoded results
- No dynamic array functions (`FILTER`, `XLOOKUP`, `SORT`, `SEQUENCE`)
- Use absolute/relative references carefully for copy behavior
- Guard against `#REF!`, `#DIV/0!`, `#VALUE!`, `#N/A`, `#NAME?`
- Prefix literal text starting with `=` with single quote

## Rendering

```bash
soffice --headless --convert-to pdf --outdir $OUTDIR $INPUT_XLSX
pdftoppm -png $OUTDIR/$BASENAME.pdf $OUTDIR/$BASENAME
```

Review for: layout, formula results, clipping, spilled text.

## Formatting — Existing Files

Render first. Preserve existing formatting exactly. Match styles for newly filled cells.

## Formatting — New Files

- Appropriate number/date/currency formats
- Headers visually distinct from data
- Set row heights and column widths for readability
- Sparingly use fill colors, borders, merged cells

## Color Conventions

Blue: input | Black: formulas | Green: linked | Gray: constants | Orange: review | Red: error | Purple: control | Teal: KPI highlights

## Finance-Specific

- Zeros as `–`, negatives in red parentheses, multiples as `5.2x`
- Units in headers (`Revenue ($mm)`)
- Cite sources in cell comments
- Blue text: inputs, black: formulas, green: links, yellow fill: key assumptions

## References

- Examples: `references/examples/openpyxl/`
