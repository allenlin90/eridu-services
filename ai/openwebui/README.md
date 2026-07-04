# Open WebUI Scaffold

This directory contains repo-managed Open WebUI assistant definitions, tool access policy, and skills.

## Intended role

Open WebUI should be the user-facing AI workspace. It should provide a small set of curated assistants rather than exposing raw LLM provider choices to every user.

## Files

| File | Purpose |
|---|---|
| `workspace-models.example.json` | Example assistant definitions for Workspace Models. |
| `tool-access.example.json` | Example MCP tool access policy by group. |
| `skills/` | Markdown skills to import or sync into Open WebUI. |

## Assistant definition pattern

Each assistant should define:

- Display name
- LiteLLM model alias
- Required skills
- Optional knowledge collections
- Allowed MCP tools
- Allowed groups
- Operational risk level

## Skill management rule

Open WebUI may be used to test skills quickly, but stable company skills should be copied back into this directory and updated through pull requests.
