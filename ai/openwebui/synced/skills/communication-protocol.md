---
name: alignment-protocol
description: >
  ERIDU work alignment protocol — how work is assigned, received, and confirmed
  across all pillars and support functions. Covers the four required elements of
  every request, the three-step alignment loop (clarify, echo back, update),
  receiver and requestor rules, channel selection for assignments, and
  cross-pillar request ownership. Load this skill whenever a request involves
  task assignment, delegation, briefs, follow-ups, deadline management, or when
  drafting or reviewing any message that assigns or accepts work. Complements
  governance-ops (communication standards). Source: bilingual staff training
  doc "Work Alignment Protocol v3" (EN/TH).
---

# Work Alignment Protocol — ERIDU

**Core principle: When in doubt, ask. Never assume, never overthink alone. Two-way alignment beats one-way guessing every time.**

This protocol applies to all staff, all pillars (Commerce, Erify, ERISA), and all support functions. It governs how work moves between people — not what the work is.

## 1. Every request must include four things

Whether assigning or receiving work, all four must be present. If any are missing, ask before starting.

1. **Deadline** — exact date and time. Not "ASAP" or "when you can."
2. **Owner** — one named person responsible. Not a team or group.
3. **Expected deliverable** — describe specifically what "done" looks like.
4. **What not to do** — explicit scope limits so the owner knows what is out of bounds.

A request missing any element is not ready to assign — and not safe to start.

## 2. The three-step alignment loop

Follow this every time work is received.

- **Step 1 — Clarify before you start.** If anything is missing or unclear, ask the requestor directly before doing any work.
- **Step 2 — Echo back your understanding.** Summarize what you plan to do and send it to the requestor. Wait for an explicit yes before proceeding.
- **Step 3 — Update, don't disappear.** Proactively report progress, blockers, or any change. Never go silent on an open task.

## 3. Rules for receivers

- If anything is unclear, ask directly. Do not guess or deliberate alone for more than **15 minutes**.
- Echo your understanding before starting. Wait for a clear yes. Then begin.
- If the deadline is at risk, notify the requestor immediately — do not wait until it is already missed.
- When work is done, confirm delivery explicitly. Do not assume silence means it was received.

## 4. Rules for requestors

- Always include all four elements. If you cannot state the deliverable clearly, you are not ready to assign.
- When the owner echoes back, respond with a clear yes or a correction. Silence is not confirmation.
- If you change scope, deadline, or expected output mid-execution, that is a **new request** — restart the alignment loop from Step 1.
- If you want to drop a task, tell the owner explicitly. Never leave a task open without a decision.

## 5. Right channel for the right message

Follows the channel defaults in governance-ops, tightened for assignments:

- **LINE** — quick coordination and updates. Not for formal assignments.
- **Email** — any request with a deadline, deliverable, or approval that needs a clear record.
- **Calls** — urgent matters that cannot wait for a written response.

If a request starts verbally or on LINE, follow it up in writing. A verbal mention is not an assignment.

## 6. Verbal is not confirmed

"I mentioned it in the standup" is not an assignment. Meeting discussions only count when followed by a written summary with a named owner and a deadline. (This aligns with the meeting-records requirement in governance-ops: action items must have an owner and a deadline.)

## 7. "Noted" is not alignment

Replying "noted" or a thumbs-up does not mean alignment. The receiver must echo back their interpretation. If a requestor receives only "noted," follow up and ask for the echo-back.

## 8. Cross-pillar requests need one named requestor

When a job involves Commerce, Erify, and/or ERISA, one named person owns the brief and receives the echo-back. Multiple stakeholders can be informed, but there is exactly one requestor of record.

## Never do these

- Assume a task is cancelled without being told
- Assume a task is done without confirming delivery
- Start work before echoing your understanding and getting a yes
- Deliberate alone on a blocker for more than 15 minutes without asking
- Send a vague request and expect a precise result
- Change scope mid-task without restarting the alignment loop

## How the AI applies this skill

When this skill is loaded, the AI should actively enforce the protocol, not just cite it:

- **Reviewing or drafting an assignment:** check for all four elements (deadline, single named owner, deliverable, scope limits). Flag anything missing before helping polish wording.
- **Drafting an echo-back:** structure it as — what will be done, by whom, by when, what is explicitly out of scope, and a direct request for a yes/no confirmation.
- **Someone received a vague request:** do not fill the gaps by guessing. Draft the clarifying questions to send back to the requestor instead.
- **Mid-task scope change detected:** point out that this is a new request and the alignment loop restarts from Step 1.
- **Channel check:** if an assignment is being made on LINE or verbally, remind the user to follow up in writing (email) for the record.
- **Deadline risk mentioned:** prompt immediate notification to the requestor — never help draft a late excuse after the fact when an early warning was possible.

## Relationship to other skills

- **governance-ops** — channel defaults, response-time expectations, meeting records, documentation standards. This protocol is the task-level layer on top of those standards; if they ever conflict, governance-ops and Layer 1 principles win.
- **core-principles** — escalation model (act / notify / propose / escalate) applies when a blocker exceeds the receiver's authority; the 15-minute rule tells you when to stop deliberating, the escalation model tells you where to go.

---
*Source: ERIDU internal training — Work Alignment Protocol v3 (bilingual EN/TH staff training document). The bilingual version remains the training artifact for staff; this skill is the machine-readable version for the company brain.*
