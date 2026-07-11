# Open WebUI Knowledge Sources

This directory is for Git-authored, reviewed Markdown knowledge that can be synced into Open WebUI knowledge collections or served through a documentation-only MCP service.

Do not put Open WebUI skill adapters here. Skill adapters belong in `../skills/`, and live exported skill snapshots belong in `../synced/skills/`.

Recommended layout:

```text
knowledge/
└── company-wiki/
    ├── README.md
    ├── CHANGELOG.md
    ├── AGENTS.md
    ├── intake/
    ├── content/
    └── generated/
```

`intake/` documents the draft-ingestion workflow; raw Slack exports, credentials, personal data, and unreviewed bulk dumps are not committed by default. `content/` stores reviewed company knowledge. `generated/` stores disposable manifests, compact routing catalogs, and collection artifacts derived from reviewed content. `README.md` remains the human entrypoint; generated catalogs are for machine routing.

Knowledge collection membership and Open WebUI group grants must be derived from validated audience and sensitivity metadata. Do not mix restricted and general documents in one collection and rely on an assistant prompt to enforce confidentiality.

Use [`wiki-knowledge-maintainer`](../../../.agents/skills/wiki-knowledge-maintainer/SKILL.md) whenever reviewed content changes and for routine deadline, clarity, contradiction, duplication, link, and routing checks. This is a repository-maintenance skill; do not attach it to employee-facing Open WebUI assistants.
