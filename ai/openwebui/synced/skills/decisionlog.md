---
name: decisionlog
description: >
  ERIDU decision log — records concluded decisions from founder sessions that
  require changes to brain skill files. Reviewed and actioned by Founder only.
  Minimum quarterly, or as needed.
---

# Decision Log — ERIDU Brain

## How this works

During any chat session, when we conclude something that requires a change to
a brain skill file, type `/log` followed by a brief description of what was
decided. Claude will write a structured entry below with the exact change to
make, enough context to recall the discussion, and clear instructions for the
edit.

At review time (quarterly or sooner), open this file, read each pending entry,
and decide: **update the skill** or **skip**. Mark each entry accordingly.

**Trigger:** `/log [brief description of the decision]`
**Who logs:** Claude, on Founder instruction.
**Who reviews:** Founder only.
**What belongs here:** Governance decisions — policy, authority, principles,
guardrails, process rules. Not operational data (that goes through the CRM).

---

## Entry format

```
### DL-[NNN] | [YYYY-MM-DD] | [skill file]

**Decision:** [one sentence — the exact change to make]
**Context:** [one sentence — what discussion or topic led to this decision]
**Edit:** [specific instruction: section name, what to add / change / remove]
**Status:** pending
```

---

## Pending

<!-- Claude appends new entries here. Newest at top. -->

---

## Done

<!-- Move entries here after review. Mark as: updated / skipped + date. -->
