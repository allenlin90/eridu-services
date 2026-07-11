---
name: ui-mockup-discussion
description: Validate a new or undecided frontend UX with the user before writing an implementation plan, using rendered visual mockups (Artifact, grounded in the real @eridu/ui design system) as the discussion medium instead of prose descriptions. Use during design/spec review or brainstorming for any feature whose UX isn't already settled — a new page, a new flow, a new panel/dialog shape, a redesign. Do not use once an implementation plan already exists, and do not use for a UX that's already fully specified (e.g. "add a column to this existing table") — go straight to implementation.
---

# UI Mockup Discussion

A picture is faster to react to than a paragraph. When a feature's UX is genuinely undecided, generate rendered mockups and let the user react to what they see, rather than asking them to approve a written description or a wall of options in chat.

## When to Use

- A design/spec doc leaves the frontend UX unsettled ("exact visual treatment is left to implementation" is a signal, not a green light to skip validation).
- The user asks "what should this look like" or "can you mock this up first."
- A new page, panel, dialog, or flow has no existing precedent in the app to anchor the conversation.
- Multiple structurally different approaches are all plausible and the tradeoff isn't obvious from prose alone (e.g. modal vs. docked panel, inline edit vs. separate review screen).

**Skip this skill** when the UX is already fully specified by an existing pattern (a new field on an existing form, a new column on an existing table) — implement directly instead.

## Relationship to Other Skills

- **`prototype` (UI.md branch)** explores a page's *structure* by wiring several variants into the *real, running app* with real data and real routes — used when a page already exists and the question is "which layout works better." This skill is upstream of that: it validates a flow's UX *before any implementation exists*, often before the backend contract is even finalized, using a standalone rendered mockup — not wired to real data, not part of the app's route tree.
- **`artifact-design`** governs the visual craft (typography, palette, layout, theme-awareness) for whatever mockup you build. Load it before writing the mockup file — it's the how; this skill is the when/why/process.
- Feeds the eventual PR: per `.agents/workflows/pr-review.md`'s PR description check, a PR that implements a UX validated this way should reference the settled decision (spec section, artifact link if still live, or a one-line summary) for traceability between what was agreed and what shipped.

## Process

### 1. Ground the mockup in the real app, not a generic template

Before drafting anything, look at:
- The actual `@eridu/ui` components this feature will realistically use (Sheet, Dialog, DataTable, Badge, etc.) — reuse their real visual language (spacing, radii, type scale), don't invent a parallel design system.
- An existing page in the same app doing something structurally similar, if one exists — match its chrome/density so the mockup reads as "this app," not a landing page.
- The real data shape, where known (from a design spec's API contract, an existing schema) — populate the mockup with realistic field names and values, not `Lorem ipsum` or generic placeholders like "Item 1."

### 2. Decide how many variants

- **Direction is genuinely open** (e.g. "should this be a modal or a side panel?"): default to **2–3 structurally distinct variants**. More than 3 stops being a real choice and starts being noise.
- **Direction is chosen, details need settling** (e.g. "we agreed on a side panel — now which fields, what states"): **1 mockup**, refined through discussion rather than compared against alternatives.

Variants must disagree on something structural — layout, information hierarchy, primary interaction — not just color or copy. Match `prototype/UI.md`'s bar for "radically different": if two drafts look like the same idea with different padding, redo one.

### 3. Build the mockup as an Artifact

Follow `artifact-design`'s process (design plan → build) for the visual layer. On top of that, for this skill specifically:
- Show the **whole relevant journey**, not one static frame — the entry point, the key interaction states (empty/loading/populated/error where relevant), and both desktop and mobile breakpoints if the feature is mobile-reachable. A single frozen screenshot-shaped mockup under-communicates a flow; a mockup the user can click through communicates it.
- If comparing variants, make switching between them cheap (tabs, a segmented control, or separate sections) so the user can flip back and forth rather than holding two conversations in their head.
- Interactive elements (buttons, expandable sections, tab switches) should actually respond, even with fake/static data underneath — a mockup that only *looks* right but doesn't click right undersells the real interaction cost of the design.

### 4. Present and discuss — don't ship the first draft as final

Hand the artifact to the user with a specific question, not just a link: "Which of these fits — or is it a mix?" Expect and welcome pushback. The valuable feedback is usually "I want the header from A with the flow from B," not a clean pick of one variant.

Iterate in the same artifact (redeploy to the same URL, per the Artifact tool's update flow) rather than creating a new one per round — the user should be able to reference "the mockup" as one stable thing across the conversation.

### 5. Record the settled decision durably

Once the user signs off, the answer belongs in the design/spec doc, not just in chat history — write it into a "Frontend" or "UX" section as a positive statement of what was decided (per `doc-hygiene`: state the decision, don't narrate the back-and-forth that produced it). Include enough concrete detail that an implementation plan can be written from it directly: which component patterns to reuse, what states exist, what's explicitly out of scope.

### 6. Clean up

The mockup answered a question; once the question is answered, it has done its job. Either:
- Leave it published if the user wants to keep referencing it during implementation (note the artifact URL in the spec doc), or
- Let it go stale once the settled decision is captured in the spec — don't feel obligated to keep maintaining the mockup in sync with implementation drift; the spec section is now the source of truth.

## Anti-patterns

- **Describing three options in prose and asking the user to pick.** If the UX is genuinely undecided, build it — text descriptions of layout are much harder to react to than a rendered page.
- **A mockup that doesn't match the real design system.** A mockup that looks like a different product doesn't validate anything about how the feature will actually feel in this app.
- **Skipping straight to an implementation plan because "the design spec covers it."** A spec's prose UX description ("a review drawer with a reason field") is not the same as a validated design — build the mockup if the visual/interaction details aren't already settled.
- **Treating the mockup as disposable and forgetting to record the decision.** The mockup itself should not survive past this conversation; the *decision* must, in the spec doc.
