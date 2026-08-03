---
name: verify-branch-before-commit
description: Always confirm the checked-out branch name right before `git commit` in this repo's integration-PR child-branch workflow
metadata:
  type: feedback
---

Run `git branch --show-current` (or check it in the same tool call as the
commit) immediately before committing, not just at the start of a session —
re-verify if any branch/checkout operations happened in between.

**Why**: under `integration-pr-delivery`, a child branch (e.g.
`feat/show-issue-reconciliation-backend`) is created from an integration
branch (e.g. `integration/show-issue-ownership`) and both refs point at the
exact same commit at creation time. If the working tree ends up on the
integration branch instead of the child branch — the two are
indistinguishable by `git log` alone since they share history — a commit
lands on the wrong ref. `git commit`'s own `[branch hash]` output line is the
cheapest confirmation; check it against the intended branch name right after
committing, not just before.

**Fix if it happens**: the commit isn't lost, only mis-pointed.
`git checkout <intended-branch> && git merge --ff-only <bad-branch-or-sha>`
moves it, then `git branch -f <wrong-branch> origin/<wrong-branch>` restores
the polluted branch to match its remote (safe since the only local-only
commit is the one just moved off it).

**How to apply**: in any task that specifies "you are on branch X, commit
there" — especially multi-branch integration-PR workstreams — verify branch
identity immediately before AND after the commit call, not only when the
session starts.
