# User-Facing Documentation — Detailed References

Templates, language guidelines, diagram patterns, and FAQ generation rules for user-facing docs.

## Document Templates

### User Guide Template

```markdown
---
title: <Feature Name> — <Role> Guide
description: How to <do the thing> as a <role> in <app name>.
sidebar:
  order: <N>
---

> **Role required**: <Role Name(s)>
> **App**: erify_studios / erify_creators

## At a Glance

<2-3 sentences: what this feature lets you do and why it matters.>

\`\`\`mermaid
flowchart LR
    A[Start] --> B[Step] --> C[Result]
\`\`\`

## What You Need

- <prerequisite 1 — with link to setup guide if applicable>
- <prerequisite 2>

## How It Works

### 1. <Action Name>

<What to do, what you'll see, what to enter. Use plain language.>

> [!TIP]
> <Helpful shortcut or best practice>

## What to Expect

After completing these steps:
- <outcome 1>
- <outcome 2>

## Common Questions

### <Question as the user would ask it?>

<Short answer with verification steps if needed.>

→ *See also: [Related Guide](/path/to/related)*

## Related

- [<SOP name>](/<workflow-area>/<name>) — Daily procedure for this feature
```

### SOP Template

```markdown
---
title: "SOP: <Procedure Name>"
description: Step-by-step procedure for <what and when>.
sidebar:
  order: <N>
---

> **Who runs this**: <Role(s)>
> **When**: <Trigger — daily at X, before each show, when Y happens>
> **Time needed**: <Estimate>

## Overview

<1-2 sentences.>

## Checklist

### Step 1: <Action>

- [ ] <What to verify or do>
- [ ] <Expected result>

> [!WARNING]
> <What goes wrong if you skip this step>

## If Something Goes Wrong

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| <what you see> | <why> | <what to do> |
```

### FAQ Page Template

```markdown
---
title: "FAQ: <Feature Area>"
description: Common questions about <feature area>.
sidebar:
  order: <N>
---

### <Question?>

<Answer — 1-3 short paragraphs.>

→ *See also: [Guide](/path)*
```

## Language & Tone Guidelines

### Do
- Active voice: "Click the Create button"
- Present tense: "The calendar shows your shifts"
- Address reader as "you"
- Use app-visible label: "Shift Calendar" not "ShiftCalendarService"
- Bold for UI elements: "Click **Create Show**"
- `> [!TIP]` for best practices, `> [!WARNING]` for destructive actions

### Don't
- Technical jargon: API, endpoint, schema, payload, JWT, guard, middleware, UID
- Reference code: file paths, function names, class names
- Explain architecture: just say what the user sees
- Passive voice for instructions

### Translating Technical Concepts

| Technical Term | User-Facing Language |
|---------------|---------------------|
| API endpoint | Feature / action |
| JWT / session token | Your login session |
| StudioMembership | Studio access / your role |
| StudioProtected guard | Requires [Role] access |
| Soft delete | Removed (can be restored by an admin) |
| Optimistic locking | Someone else edited this at the same time |
| 401 Unauthorized | You need to log in again |
| 403 Forbidden | You don't have permission |
| 404 Not Found | This item doesn't exist or was removed |
| 409 Conflict | This conflicts with an existing record |
| Validation error (400) | Please check the highlighted fields |
| BullMQ job / queue | Processing — this may take a moment |

## Diagram Guidelines

- Use plain language labels (not technical terms)
- Keep to 5-8 nodes maximum per diagram
- Use decision diamonds for branching paths
- Mark success states with checkmarks
- Supported types: user flow (flowchart LR), process (flowchart TD), state (stateDiagram-v2)

## FAQ Generation Sources

1. Edge cases from PRD acceptance criteria
2. Role confusion — "Can I do X?" based on role matrix
3. State transitions — "What happens if I do X while Y?"
4. Recovery — "I made a mistake, how do I fix it?"
5. Prerequisites — "Why can't I see X?"

Rules:
- Write questions as users would ask them
- 1-3 short paragraphs max per answer
- Include numbered checklist for verification steps
- Always end with "See also" link
- Group by feature area, not role
