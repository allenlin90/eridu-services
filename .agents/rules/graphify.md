# graphify (Google Antigravity)

**Usage**: Optional local CLI that builds a queryable knowledge graph of a corpus at `graphify-out/`.

Canonical rule: `AGENTS.md` § graphify (Knowledge Graph). This file exists only because Antigravity discovers `.agents/rules/` natively; do not let the two drift.

## Availability

`graphify-out/` is gitignored, so it does not exist on a fresh clone. Treat graphify as available only when both `command -v graphify` succeeds and `graphify-out/graph.json` exists. Otherwise fall back to normal search without mentioning the tool.

## Rule

When available, orient with the graph before reading raw files, in this order:

```bash
graphify explain "<Symbol>"    # source location, methods, immediate neighbors — strongest command
graphify path "<A>" "<B>"      # shortest relationship chain between two symbols
graphify query "<seed>"        # BFS seeded by symbol/keyword match, NOT natural-language Q&A
graphify update .              # refresh after a batch of changes (AST-only, no API cost, ~30s here)
```

Seed `query` with an identifier, not a sentence — a prose question matches literal words and returns noise. Large result sets are truncated; narrow the seed or raise `--budget`.

Prefer `rg` when you already know the exact identifier and only need its definition or call sites. Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review, or when the commands above do not surface enough context.

This does not displace skill-first development: load the relevant skill from `.agents/skills/` first, then use graphify to locate the code it applies to.

## Why

A scoped subgraph is far smaller than `GRAPH_REPORT.md` or raw grep output for the same question. The graph is orientation only — inspect the canonical source before editing or making an important claim.
