---
description: Verdict on PR merge-readiness — runs the pr-review.md gate end-to-end, including the knowledge/doc Wrap-up, then gives a READY / NOT READY verdict
argument-hint: "[PR number or branch — optional, defaults to current branch vs origin/master]"
---

# PR Readiness Verdict

Determine whether this PR is ready to merge by running `.agent/workflows/pr-review.md` to completion. Target: `$ARGUMENTS` (if empty, review the current branch against `origin/master`).

Follow the workflow exactly — do not summarize it from memory:

1. **Read the workflow.** Open `.agent/workflows/pr-review.md` and follow it top to bottom.
2. **Scope.** Run `git diff --name-only origin/master...HEAD` (or the given PR's diff) and run only the gates that match the changed layers.
3. **Run every applicable gate** (erify_api / eridu_auth / frontend / shared package / documentation) and the **Verification gate** (`lint` · `typecheck` · `test` · `build` for each affected workspace). Report actual command output — never assert a check passed without running it.
4. **Run the Wrap-up step** — this is part of the verdict, not optional:
   - Sync skills/workflows/rules/canonical docs/memory for any pattern this PR established (`knowledge-sync.md`, scoped to this PR).
   - Retire lifecycle docs this PR completed — promote/delete shipped design docs, PRDs, and superpowers specs; update the roadmap row status; fix stale links (`doc-lifecycle.md`).
   - Fold those changes into the PR: commit + push on the PR branch (confirm before pushing, squash-merge style) and update the PR description to match what was delivered.
5. **Verdict.** End with an explicit, scannable result:

   ```
   ## Verdict: READY ✅  |  NOT READY ⛔

   Blockers (if any):
   - <gate> — <what failed + file:line>

   Wrap-up:
   - Skills/docs synced: <yes/n/a — what changed>
   - Lifecycle docs retired: <yes/n/a — what was promoted/deleted>
   - Folded into PR: <committed+pushed / pending confirmation>
   - PR description updated: <yes/no>
   ```

A PR is **READY** only when all applicable gates pass, verification is green, and the Wrap-up changes have landed in this PR. If anything blocks, say **NOT READY** and list the specific blockers with file references — do not soften the verdict.
