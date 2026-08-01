# graphify (Google Antigravity)

**Usage**: Optional local CLI that builds a queryable knowledge graph of a corpus at `graphify-out/`.

Canonical rule: `AGENTS.md` § graphify (Knowledge Graph). This file exists only because Antigravity discovers `.agents/rules/` natively; do not let the two drift.

## Availability

`graphify-out/` is gitignored, so it does not exist on a fresh clone. Treat graphify as available only when both `command -v graphify` succeeds and `graphify-out/graph.json` exists. Otherwise fall back to normal search without mentioning the tool.

## Rule

When available, orient with the graph before reading raw files:

```bash
graphify query "<question>"    # scoped subgraph answering a question
graphify path "<A>" "<B>"      # how two things relate
graphify explain "<concept>"   # one focused concept
graphify update .              # refresh after changing code (AST-only, no API cost)
```

Use `graphify-out/wiki/index.md` for broad navigation when that file exists. Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review, or when query/path/explain do not surface enough context.

This does not displace skill-first development: load the relevant skill from `.agents/skills/` first, then use graphify to locate the code it applies to.

## Why

A scoped subgraph is far smaller than `GRAPH_REPORT.md` or raw grep output for the same question. The graph is orientation only — inspect the canonical source before editing or making an important claim.
