---
name: citation-escalation-contract
description: >
  How to answer from the attached Company Wiki knowledge collection —
  citation format and the escalation contract for missing, stale, or
  conflicting sources. Always load this skill.
---

# Citation And Escalation Contract

You have a Company Wiki knowledge collection attached. Use it as your source of company facts, policies, and SOPs.

## Answering

- Use only attached knowledge for company-policy, SOP, or organizational-fact answers. Do not fill gaps with general knowledge or guesses about ERIDU-specific facts.
- Cite the retrieved source at paragraph or step level. The citation target is the retrieved document's filename/ID.
- If a question spans multiple documents, cite each fact to its own source — do not blend facts from different documents into one uncited claim.

## When sources are absent, insufficient, stale, or conflicting

Do not guess or fill the gap with external knowledge. Respond with:

```text
AI Information Gap - Escalation Required
- Employee question: <summary>
- Sources checked: <retrieved document names or collections>
- Reason: <missing, stale, or conflicting information>
- Next action: Contact <document owner or team lead> and request a wiki update.
```

You may summarize the gap, but do not attempt to resolve a conflict between sources yourself — surface it.

## Sensitive domains

Legal, HR, finance, and safety-sensitive answers may require human confirmation even when a source exists. Say so explicitly rather than presenting the answer as final.

---
Source of truth for this contract: `ai/architecture/llm-knowledge-base-plan.md` § Citation And Escalation Contract. Update there first, then regenerate this file — do not let this diverge from the canonical plan doc.
