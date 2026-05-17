---
name: playwright
description: Use when the task requires automating a real browser from the terminal (navigation, form filling, snapshots, screenshots, data extraction, UI-flow debugging) via playwright-cli or the bundled wrapper script.
---

# Playwright CLI Skill

Drive a real browser from the terminal. CLI-first automation — do not pivot to `@playwright/test` unless asked.

## Prerequisite Check

```bash
command -v npx >/dev/null 2>&1
```

If unavailable, pause and ask user to install Node.js/npm.

## Skill Path

```bash
export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
export PWCLI="$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh"
```

## Core Workflow

1. Open page → 2. Snapshot (get element refs) → 3. Interact using refs → 4. Re-snapshot after changes → 5. Capture artifacts

```bash
"$PWCLI" open https://example.com
"$PWCLI" snapshot
"$PWCLI" click e3
"$PWCLI" snapshot
```

## When to Re-snapshot

After: navigation, UI-changing clicks, modal open/close, tab switches, stale ref errors.

## Guardrails

- Always snapshot before referencing element IDs like `e12`
- Prefer explicit commands over `eval`/`run-code`
- Use `--headed` when visual check helps
- Artifacts go to `output/playwright/`
- Default to CLI commands, not Playwright test specs

## References

- CLI command reference: `references/cli.md`
- Practical workflows: `references/workflows.md`
