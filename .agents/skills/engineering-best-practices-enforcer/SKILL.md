---
name: engineering-best-practices-enforcer
description: Audit eridu-services against repo patterns; use code-quality for tooling and SOLID for design.
---

# Engineering Best Practices Enforcer

Staged code quality reviews and refactors aligned with monorepo architecture.

> See [references/enforcer-details.md](references/enforcer-details.md) for refactor impact protocol, repository review checklist, and micro-decision rules.

## Priority Model

1. Repo context and established patterns (`AGENTS.md`, `.agents/rules/*`, local conventions)
2. Official framework/library guidance
3. Design principles (SOLID, clean code)

## Workflow

1. Identify scope (`single feature`, `workspace`, `cross-workspace`)
2. Load relevant skills for affected layers
3. Read local patterns before proposing changes
4. Run quality scanner: `bash .agents/skills/engineering-best-practices-enforcer/scripts/scan-quality-signals.sh`
5. Perform impact and risk assessment (classify: behavior-preserving / adjacent / changing; risk: low / medium / high)
6. Produce severity-ordered findings with file references
7. Execute small safe batches, verify each workspace

## Tech-Debt Registers

Check before producing new findings:
- `docs/tech-debt/README.md`
- `apps/erify_studios/docs/FRONTEND_TECH_DEBT.md`

Cite or extend existing entries instead of opening parallel issues.

## Documentation Lifecycle

| Content type | Location |
|---|---|
| Implemented/canonical docs | `docs/` root |
| Unimplemented proposals/plans | `docs/ideation/` |
| Status index | `docs/README.md` |

## Output Contract

For every review batch:
1. Findings (severity ordered, file refs)
2. Open questions and assumptions
3. Impact summary (entry points, shared modules, risk tier)
4. Refactor plan (incremental batches)
5. Verification commands + outcomes
6. Residual risk + rollback unit

## References

- Official guidance index: [references/official-docs.md](references/official-docs.md)
