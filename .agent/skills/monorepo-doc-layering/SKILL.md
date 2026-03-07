---
name: monorepo-doc-layering
description: This skill should be used when creating, restructuring, or reviewing documentation in eridu-services so docs are placed in the correct layer: root roadmap/product, app implementation docs, app design docs, or package READMEs.
---

# Monorepo Doc Layering

Use this skill when documentation scope crosses app boundaries, when roadmap ownership is unclear, or when docs are drifting into the wrong layer.

## Purpose

Preserve a consistent documentation model in `eridu-services`:

- root docs own roadmap and product/domain context
- app docs own implemented behavior and app-specific design proposals
- package READMEs own package contracts and usage

## Workflow

1. Classify the document before editing:
   - `product/domain`
   - `roadmap/phase`
   - `implemented backend behavior`
   - `implemented frontend workflow`
   - `app-specific design`
   - `package contract`
2. Place the document in the correct layer using the reference map in [references/layer-map.md](references/layer-map.md).
3. If cross-app content currently lives under one app:
   - move or re-home the substantive content to root `docs/`
   - leave a thin stub or pointer in the old app location only when link stability matters
   - otherwise remove the old app-local copy after references are updated
4. Keep root roadmap docs free of app-specific implementation detail beyond what is needed to explain scope or status.
5. Keep app canonical docs focused on shipped behavior, not phase planning.
6. Keep app design docs focused on proposals, not shipped behavior.
7. Update the nearest README indexes whenever a doc moves layers.
8. Remove legacy ownership language that still implies one app owns the product or roadmap.
9. Run a markdown-link check after reorganization.

## Placement Rules

- Put cross-app roadmap and phase status in `docs/roadmap/`.
- Put business, product, domain, and cross-app requirement context in `docs/product/`.
- Put architecture decision records in `docs/adr/`.
- Put backend implementation references in `apps/erify_api/docs/`.
- Put frontend workflow references in `apps/erify_studios/docs/`.
- Put backend-only proposals in `apps/erify_api/docs/design/`.
- Put frontend-only proposals in `apps/erify_studios/docs/design/`.
- Put shared package API/usage information in package `README.md` files.

## Review Questions

- Does this document make the project look owned by one app when it is actually cross-app?
- Is this describing current behavior or proposed behavior?
- Is this requirement stable product context or a phase-specific planning note?
- Will another engineer know where to look first for roadmap vs implementation vs design?
- Is the README/index at this layer still accurate?

## Verification

After doc moves or index updates:

1. Scan markdown links in touched doc trees.
2. Check for duplicated ownership language between root docs and app docs.
3. Confirm phase status appears only in root roadmap docs unless an app file is explicitly marked as archive/history.
