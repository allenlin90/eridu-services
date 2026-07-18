---
name: user-facing-docs
description: Create eridu_docs guides, SOPs, FAQs, and onboarding for shipped product features.
---

# User-Facing Documentation Generator

Convert technical PRDs and feature docs into clear, non-technical docs for app users and studio operators.

> See [references/templates-and-guidelines.md](references/templates-and-guidelines.md) for document templates, language rules, and diagram patterns.

## Audience

**App users and studio operators** — not developers. They care about *what they can do*, *how to do it*, and *what happens when something goes wrong*.

## Content Architecture

Docs live in `apps/eridu_docs/src/content/docs/`. Organized by workflow area, not genre:

```
scheduling/
  google-sheets-publishing.mdx
  publish-sop.mdx
  faq.mdx
```

See [eridu-docs-information-architecture](../eridu-docs-information-architecture/SKILL.md) for full IA guidance.

## Conversion Workflow

### 1. Identify Source
Gather PRDs (`docs/prd/`), feature docs (`docs/features/`), workflow docs (`docs/workflows/`), or app design docs.

### 2. Extract User-Relevant Content
**Include**: What it does, who can use it, step-by-step instructions, outputs, error recovery, prerequisites.
**Exclude**: API endpoints, schemas, architecture, implementation details.

### 3. Determine Output Documents
- Feature belongs to existing workflow area → add pages there
- 2+ roles interact differently → separate pages in same area
- Repeatable process → SOP page
- Known edge cases → FAQ page

### 4. Write with Layered Abstraction
Every doc: At-a-Glance → What You Need → How It Works → What to Expect → Common Questions → Related Guides.

### 5. Add Visual Diagrams
Mermaid diagrams for user flows, process SOPs, and state transitions. Plain language, ≤8 nodes.

### 6. Cross-Link and Validate
- Cross-link: guide → SOP → FAQ
- Validate role accuracy against `StudioProtected` guards
- Verify every PRD acceptance criterion has a corresponding instruction

## Integration with Doc Lifecycle

When the `doc-lifecycle` skill promotes a shipped PRD:
1. Promote to feature doc → `docs/features/`
2. Generate user-facing docs (this skill) → `apps/eridu_docs/`
3. Update sidebar only if new workflow area introduced
4. Cross-link feature doc ↔ workflow pages

## Checklist

- [ ] Every doc has "At a Glance" summary + Mermaid diagram
- [ ] Role requirements stated at top
- [ ] No technical jargon (grep for: API, endpoint, schema, JWT, guard, UID, Prisma)
- [ ] FAQ answers end with "See also" link
- [ ] Cross-links between guides, SOPs, and FAQs
- [ ] All role names match UI labels, not code constants
- [ ] Frontmatter `title` and `description` set

## Reference

- **eridu_docs**: `apps/eridu_docs/`
- **Sidebar config**: `apps/eridu_docs/astro.config.mjs`
- **Mermaid**: `astro-mermaid` integration (installed)
