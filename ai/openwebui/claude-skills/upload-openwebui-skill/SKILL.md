---
name: upload-openwebui-skill
description: Add or update an Open WebUI skill in eridu-services, bind it to approved models, and open a deployment PR.
---

# Upload Open WebUI Skill

This is the Claude Chat and Cowork adapter for the repository-owned delivery workflow. It creates a
Git change; it never uploads directly to Open WebUI.

## Load the current authority

Before acting, use the configured GitHub connection to read these files from the current `master`
branch of `allenlin90/eridu-services`:

1. `.agents/skills/upload-openwebui-skill/SKILL.md`
2. `.agents/workflows/openwebui-sync-delivery.md`
3. `ai/openwebui/skills/index.json`
4. the relevant `ai/openwebui/models/*.json` manifests and existing skill file

The first two files own the procedure and safety rules. Follow their current versions rather than
repeating or reconstructing the workflow from this packaged adapter. If either cannot be read, stop
and report a setup error; do not continue from memory.

## Cowork tool mapping

- Treat an attached Markdown file as the requested skill content.
- Use the GitHub connection for repository reads, a focused branch, and a pull request to `master`.
- If GitHub write or pull-request access is unavailable, prepare a precise patch/handoff and state
  that no PR was opened.
- Never request, store, or expose `OPEN_WEBUI_API_KEY`; only the trusted post-merge workflow receives
  that credential and writes live state.
- Never claim the skill is deployed merely because a PR exists or was merged. Report the PR and
  deployment states separately.

## Final report

Return the canonical Git path, approved model bindings or reviewed exception, affected groups and
direct-use implication, PR URL or handoff reason, and `Deployment: pending merge`.

Organization setup, a first-run prompt, update behavior, and troubleshooting are documented in
`ai/openwebui/claude-skills/README.md` in the repository.
