---
name: doc-hygiene
description: Keep any doc that can be updated and reasoned about — ideation drafts, feature docs, PRDs, architecture references, skills, workflows, canonical docs, READMEs — clean of reasoning artifacts so each revision reads as the current state, not the path that produced it. Trigger any time a doc is being refined, refactored, reorganized, or amended, regardless of whether it is committed. Trigger especially when about to write phrases like "after auditing", "verified on <date>", "previously listed as a blocker", "now resolved", "originally framed as", or numbered gap/decision lists whose items are already addressed. The doc body is for the current truth; reasoning trails belong in commits, PRs, or explicitly-named decision logs.
---

# Doc Hygiene

A doc — design, feature, skill, workflow, canonical reference, or otherwise — is a snapshot of the current best understanding. When a doc is being updated, every revision rewrites that snapshot. Readers should not see the residue of the conversation, audit, or debate that produced it.

## Why this matters

A reader who opens the doc later has no context for "verified 2026-05-02" or "G6 was a concern, now resolved." Those phrases force the reader to reconstruct a debate that has already concluded, and they age badly: dates drift, gap numbers stop matching anything, and "previously" implies a state the reader cannot see. The doc gets harder to understand the more it is iterated on.

This applies to every kind of doc that gets updated — not just ideation drafts. A skill that says "originally we used pattern X but now use pattern Y" is harder to follow than one that just states pattern Y. A feature doc that retains "after auditing the FE in March, we found…" forces every future reader to ask whether that audit is still load-bearing.

Audit trails are valuable, but they belong in commit messages, PR descriptions, and explicitly-named decision logs — not in the doc body.

## Three doc modes (apply the rule that fits)

| Mode | What it is | Hygiene rule |
| --- | --- | --- |
| **Working doc** (default) | Any doc being actively updated: ideation, feature doc, PRD, skill, workflow, canonical reference, README, architecture sketch | Keep clean. The doc states the current understanding as positive assertions. |
| **Decision log / changelog** | A doc explicitly named as a log (e.g., `DECISIONS.md`, `CHANGELOG.md`, `RFC-NNN.md` archives) | Keep the audit trail — that is the point. |
| **Committed doc with new revisions** | Already merged, now being amended | Surface what changed in the PR description and commit message. The doc body still reads as current truth. |

If unsure which mode applies, default to working-doc rules.

## Remove before saving (red flags)

These phrases almost always signal reasoning leakage. Cut or rewrite each one as a positive statement.

- "After auditing…", "After investigating…", "After the FE audit…", "After reviewing…"
- "Verified <date>", "Confirmed <date>", "(checked 2026-XX-XX)" inside section headers or bullets
- "Previously listed as…", "Originally framed as…", "Used to be a blocker…", "We initially thought…"
- "Risk:" / "Resolved:" paired framing where the risk is no longer open
- "Original framing | Resolution" two-column tables for items that are now decided
- Numbered gap/concern lists (G1, G2, G3…) once the items are resolved — fold them into Decisions of Record or Open Items
- File:line citations added to prove an investigation happened, not to point at where a change lands or where a reader should navigate
- "We checked X and found Y" preamble before stating a decision
- Status lines that narrate the iteration ("ready for PRD authoring after the 2026-05-02 audit")
- Apologetic or speculative hedges that record a past doubt ("we used to worry about X, but actually…")
- Comments like `// removed because…`, `// previously this was…` left as scar tissue

## Keep

- The current state as a clean statement.
- Premises, constraints, and decisions written as positive assertions.
- Open items only when they are real gaps a future reader needs to act on. Each open item names the action and who/when, not the history.
- File citations only when they specify *where the change lands* or *where a reader should look* — they help navigation, not justification.
- Diagrams that explain structure, not diagrams that re-show the iteration sequence.
- Production data snapshots when they ground a current decision (e.g., "the registry currently contains 96 suffixed entries"). Drop the date framing if it is not load-bearing.

## Rewrite patterns

| Reasoning artifact | Clean rewrite |
| --- | --- |
| "G4 was previously a design gap; verified 2026-05-02 the picker exists at `task-template-builder.tsx:646-713`." | (Drop the gap framing. If the picker location matters for implementation, mention it once in the relevant phase or file change map.) |
| "After auditing the FE builder, no product decision blocks PRD sign-off." | "Ready for PRD authoring." |
| "Risk: upload contract may need widening. Resolved: schema regex already accepts v2 ids." | "The upload presign schema already accepts v2 field ids; Phase 2 adds an engine-aware lookup branch." |
| "G1, G2, G3 are hard blockers. G4–G8 are already covered." | (Delete the gap list. Move surviving open items to "Open Items"; fold resolutions into "Decisions of Record".) |
| "Originally we considered X and Y, but ultimately chose Z because…" (in a skill or feature doc) | "Use Z. <one-line reason if non-obvious.>" |
| "This used to use `field.key` as the storage key (see history)…" | (Just describe the current contract.) |

## Workflow

When asked to refine, refactor, or reorganize a doc:

1. Read the current doc fully before editing.
2. Identify which mode applies (working / decision log / committed-with-revisions). Default to working-doc rules.
3. Scan for the red-flag phrases above. List them mentally before writing.
4. Decide what stays as current truth (positive assertion), what becomes an open item (real future action), and what is dropped (reasoning trail).
5. Rewrite. The doc should read end-to-end as if the current understanding has always been the understanding.
6. If the user explicitly wants an audit trail, propose putting it in the PR description, commit message, or a sibling `DECISIONS.md` instead.

When the assistant is mid-conversation and about to add reasoning artifacts (e.g., during interactive refinement): pause, write the clean statement into the doc, and put the reasoning into the chat reply instead.

## Related

- `AGENTS.md` — Knowledge and Doc Lifecycle.
- `.agent/workflows/ideation-lifecycle.md` — when an ideation doc transitions toward PRD or feature doc status.
- `.agent/workflows/doc-lifecycle.md` — phase-boundary doc reorganization.
- `.agent/workflows/knowledge-sync.md` — keeping docs in sync after feature delivery or refactors.
- `.agent/workflows/feature-version-cutover.md` — version cutover is the right place to surface audit history; the doc body still reads as current truth.
