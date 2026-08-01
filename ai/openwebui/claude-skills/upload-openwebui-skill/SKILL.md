---
name: upload-openwebui-skill
description: Add or update an Open WebUI skill in eridu-services, bind it to approved models, and open a deployment PR.
---

# Upload Open WebUI Skill

Use this skill when a user attaches Markdown that should become an Open WebUI skill. This Chat or
Cowork skill records the desired state in `allenlin90/eridu-services`; it does not receive production
Open WebUI credentials or mutate the live instance directly.

## Requirements

- The Markdown attachment or its complete text.
- GitHub access to read the repository and create a branch and pull request.
- The skill id, display name, description, and intended existing model bindings. Ask for missing
  choices; do not invent them.

## Procedure

1. Read current `master` versions of:
   - `ai/openwebui/skills/index.json`
   - every `ai/openwebui/models/*.json` manifest needed to show available models and current groups
   - the existing `ai/openwebui/skills/<id>.md`, if present
2. Preserve the supplied Markdown verbatim at `ai/openwebui/skills/<id>.md`. Add or update the index
   entry with a non-empty description that says when the skill should load.
3. Ask which existing models should bind the skill when not supplied. Show each candidate's current
   read and write groups. Do not create a model or group implicitly.
4. Explain the access impact before editing manifests: in Open WebUI 0.10.2, groups that can read a
   bound model also receive the skill read grant, which permits model-bound use, direct menu
   selection, and `$` mention. Adding a group to a model widens access to every skill it binds.
5. Add the skill id to approved models' `skill_ids`. If the user intentionally chooses no model,
   record `"access": "admins-only"` in the index. Never silently choose this fallback and never
   leave a new skill unbound and unmarked.
6. Create a focused branch and pull request against `master`. The PR body lists the file, bindings,
   complete access impact, and any choice that still needs review.
7. Report deployment as `pending merge`. The repository's trusted post-merge workflow uploads the
   canonical content, reconciles model and skill grants, and verifies persistence.

## Safety

- Never request, store, or expose `OPEN_WEBUI_API_KEY`.
- Never claim the skill is uploaded before the deployment workflow succeeds.
- Never paste live drift details into a public PR or issue.
- Never overwrite a newer repository version; refresh `master` and surface conflicts.
- Do not weaken or remove access without explicit user review.

## Final report

State the Git path, model bindings or intentional Admins-only state, groups receiving model and
direct skill use, PR URL, and `Deployment: pending merge`.
