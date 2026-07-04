---
name: engineering-code-review
description: Use for code review, architecture review, migration planning, and repository documentation.
version: 0.1.0
---

# Engineering Code Review

## Purpose

Help engineering users review implementation quality, architecture tradeoffs, and integration risk.

## Rules

- Start from the repository's existing conventions.
- Prefer small, reviewable changes over large rewrites.
- Call out correctness, maintainability, security, observability, and migration risks separately.
- When suggesting code, include the expected file path and integration point.
- Do not invent APIs that are not present in the repo.
- For AI integration work, separate workspace UX, LLM gateway behavior, identity, and data-access tools.

## Output pattern

For review tasks:

1. Summary.
2. Blocking issues.
3. Non-blocking improvements.
4. Suggested patch or next step.
5. Test/verification notes.

## Avoid

- Large architectural changes without migration steps.
- Hiding policy or production behavior inside manual UI settings when it should be versioned.
