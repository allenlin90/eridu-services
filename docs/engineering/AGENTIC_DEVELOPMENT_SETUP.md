# Agentic Development Setup

> **Supported developer environments:** macOS and Windows through WSL2.
>
> **Primary coding agents:** Claude Code, Codex, and OpenCode.
>
> **Secondary adapters:** Cursor and GitHub Copilot. They are supported when practical but are not required for the main workflow.
>
> **Canonical setup source:** This document owns installation and machine-onboarding commands. Architecture and retrieval documents should link here instead of maintaining competing installation procedures.

## Setup Goal

A working developer machine should provide:

- Git and the monorepo runtime;
- at least one primary coding agent;
- the shared repository instructions and skills;
- RTK for compact shell output;
- QMD for local document and knowledge retrieval;
- optional Graphify for structural code queries;
- authentication for the selected agent and GitHub;
- a passing repository tooling doctor.

The setup is intentionally user-scoped. Agent credentials, hooks, plugins, QMD indexes, and Graphify indexes are local developer state and must not be committed.

## Support Matrix

| Area | macOS | Windows |
| --- | --- | --- |
| Shell environment | Native zsh/bash | WSL2 Ubuntu bash |
| Repository location | Normal local filesystem | Clone under `~/code`, not `/mnt/c` |
| Node runtime | Homebrew or nvm | nvm inside WSL |
| Claude Code | Native | Install and run inside WSL |
| Codex | Native | Install and run inside WSL |
| OpenCode | Native | Install and run inside WSL |
| RTK hooks/plugins | Native | Full support inside WSL |
| QMD and Graphify indexes | Local user cache | WSL user cache |

Do not mix a Windows-native agent executable with a repository and tooling installed inside WSL. Keep the agent, Node, Git, RTK, QMD, and repository in the same environment.

## 1. macOS Base Setup

### Install command-line tools

```bash
xcode-select --install
```

Install Homebrew when it is not already available:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Follow the shell initialization command printed by the installer, then install the base tools:

```bash
brew install git node ripgrep jq uv rtk
```

Install the repository package manager and local retrieval CLI:

```bash
npm install -g pnpm@10.32.1 @tobilu/qmd
```

Verify:

```bash
node --version       # must be 22 or newer
pnpm --version       # expected major version 10
git --version
rg --version
jq --version
uv --version
rtk --version
rtk gain
qmd --version
```

## 2. Windows WSL2 Base Setup

Run PowerShell as Administrator:

```powershell
wsl --install -d Ubuntu
```

Restart Windows when requested. Open Ubuntu and update the base packages:

```bash
sudo apt update
sudo apt install -y build-essential ca-certificates curl git jq ripgrep unzip
```

Install nvm and the current Node LTS release:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.6/install.sh | bash
. "$HOME/.nvm/nvm.sh"
nvm install --lts
nvm alias default 'lts/*'
```

The repository requires Node 22 or newer. Confirm that the selected LTS satisfies it:

```bash
node --version
```

Install pnpm, QMD, uv, and RTK:

```bash
npm install -g pnpm@10.32.1 @tobilu/qmd
curl -LsSf https://astral.sh/uv/install.sh | sh
curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
```

Reload the shell so `~/.local/bin` and other installer changes are active:

```bash
exec "$SHELL" -l
```

Verify:

```bash
node --version
pnpm --version
git --version
rg --version
jq --version
uv --version
rtk --version
rtk gain
qmd --version
```

### WSL repository location

Clone into the Linux filesystem for better filesystem and watcher performance:

```bash
mkdir -p ~/code
cd ~/code
git clone <repository-url> eridu-services
cd eridu-services
```

Avoid putting the working checkout under `/mnt/c`, `/mnt/d`, or another mounted Windows drive.

## 3. Install Primary Coding Agents

Developers need at least one primary agent. Maintainers validating repository portability should install all three.

### Claude Code

```bash
npm install -g @anthropic-ai/claude-code
claude doctor
claude
```

Follow the interactive authentication flow. Do not use `sudo npm install -g`.

Repository integration:

- Claude Code auto-loads `.claude/CLAUDE.md`.
- The adapter imports the canonical root `AGENTS.md`.
- Shared skills remain under `.agents/skills/`.

### Codex

Install with npm:

```bash
npm install -g @openai/codex
codex
```

On macOS, the official cask is an alternative:

```bash
brew install --cask codex
```

On first run, sign in with ChatGPT or configure an API key.

Repository integration:

- Codex consumes root `AGENTS.md`.
- Shared skills live under `.agents/skills/`.
- Tool-specific additions must remain thin and must not duplicate shared doctrine.

### OpenCode

On macOS, use the maintained Homebrew tap:

```bash
brew install anomalyco/tap/opencode
```

On macOS or WSL, npm is an alternative:

```bash
npm install -g opencode-ai
```

Authenticate and verify:

```bash
opencode auth login
opencode auth list
opencode
```

The interactive `/connect` command inside OpenCode is also supported.

Repository integration:

- `opencode.json` loads `AGENTS.md` and `.agents/rules/*.mdc`.
- OpenCode can discover `.agents/skills/` directly.
- The current `.opencode/skills` adapter remains supported while compatibility is evaluated.

## 4. Configure RTK

RTK reduces shell output passed into agents. It does not index knowledge.

First verify that the installed `rtk` is Rust Token Killer rather than another package with the same executable name:

```bash
rtk --version
rtk gain
which rtk
```

Initialize only the agents used on that machine:

```bash
rtk init -g                     # Claude Code
rtk init -g --codex             # Codex
rtk init -g --opencode          # OpenCode
```

Then inspect the result and restart the agents:

```bash
rtk init --show
```

These commands update user-level agent configuration. Review prompts and generated changes. They must not replace repository `AGENTS.md` or create a second canonical skill tree.

Secondary integrations:

```bash
rtk init -g --agent cursor      # Cursor
rtk init -g --copilot           # GitHub Copilot
```

Cursor and Copilot integrations are secondary and should not block the primary setup.

## 5. Clone and Install the Monorepo

```bash
git clone <repository-url> eridu-services
cd eridu-services
node scripts/check-agent-tooling.mjs # dependency-free diagnosis before workspace install
pnpm install --frozen-lockfile
```

Run the default doctor:

```bash
pnpm agents:doctor
```

The default check requires:

- the repository runtime;
- at least one primary coding agent;
- the common local development tools.

Stricter checks:

```bash
pnpm agents:doctor --strict       # recommended retrieval and shell tools required
pnpm agents:doctor --all-agents   # Claude, Codex, and OpenCode all required
pnpm agents:doctor --strict --all-agents
pnpm agents:doctor --runtime-only # skip primary-agent checks
```

## 6. Configure QMD

QMD is the primary local index for Markdown, skills, engineering references, and OKF knowledge.

Create collections from the repository root:

```bash
qmd collection add .agents --name eridu-agent-capabilities --mask "**/*.md"
qmd collection add docs --name eridu-engineering-docs --mask "**/*.md"
qmd collection add apps --name eridu-app-docs --mask "*/docs/**/*.md"
qmd collection add infra --name eridu-platform-infra --mask "**/*.md"
```

During the transitional layout, also index the existing tree:

```bash
qmd collection add ai --name eridu-ai-transitional --mask "**/*.md"
```

When `knowledge/` exists:

```bash
qmd collection add knowledge --name eridu-knowledge --mask "**/*.md"
```

Build and update the local index:

```bash
qmd update
qmd embed
qmd status
```

Example queries:

```bash
qmd search "MCP_ALLOWED_STUDIO_IDS"
qmd query "how should an agent interpret a stale OKF concept?"
qmd query "which document owns the Open WebUI to LiteLLM deployment topology?"
```

QMD configuration and indexes are local state. Do not commit them.

## 7. Install Graphify Optionally

Graphify is an optional structural index. It is not required for ordinary setup, and no verification command depends on it.

```bash
uv tool install graphifyy
graphify --version
```

Start with deterministic code-focused extraction:

```bash
graphify extract . --code-only
```

Do not run `graphify install --project`, `graphify claude install`, or `graphify hook install` in this repository. Those generators write tool-specific skills, instruction blocks, and hooks into paths already governed by `.agents/` and `.claude/`, using their own defaults. The project-scoped integration is already committed and reconciled: the vendored skill lives at `.agents/skills/graphify/` (see its `VENDOR.md`), the agent-facing rule is `AGENTS.md` § graphify (Knowledge Graph), and the Claude Code hooks are in `.claude/settings.json`. Changing any of those requires an explicit instruction-reconciliation change, not a generator run.

The derived `graphify-out/` directory is ignored by Git, so it does not exist until you build it locally. Agent instructions treat Graphify as available only when `command -v graphify` succeeds and `graphify-out/graph.json` exists.

## 8. GitHub CLI

GitHub CLI is recommended for maintainers working with PRs, reviews, and checks.

macOS:

```bash
brew install gh
gh auth login
```

WSL Ubuntu:

Follow the GitHub CLI Linux installation instructions, then run:

```bash
gh auth login
```

Verify repository access:

```bash
gh repo view
gh pr list
```

## 9. OKF Compatibility Check

All primary agents must follow [OKF Agent Compatibility Contract](./OKF_AGENT_CONTRACT.md).

A quick manual check for each installed agent:

1. Ask it to find the OKF consumer contract through repository instructions.
2. Ask it to explain the roles of `type`, `status`, `stale_after`, `sources`, and `verified`.
3. Ask it how unknown frontmatter fields should be handled.
4. Ask it to distinguish canonical knowledge from an Open WebUI publication artifact.
5. Ask it to navigate from `index.md` without loading an entire bundle.

Do not consider a client compatible merely because it can read Markdown. It must preserve lifecycle, provenance, extension metadata, and source authority.

## 10. Final Verification

```bash
pnpm agents:doctor --strict
pnpm agents:validate
pnpm lint:markdown
pnpm typecheck
```

Run all-agent compatibility only on machines intended to validate all supported clients:

```bash
pnpm agents:doctor --strict --all-agents
```

## Troubleshooting

### `rtk gain` fails

Another package named `rtk` may be installed. Remove it and install Rust Token Killer from `rtk-ai/rtk`, then verify `rtk gain` again.

### Global npm permission errors

Do not use `sudo npm install -g`. Use nvm or fix the user-level npm prefix.

### WSL file watching is slow

Move the repository from `/mnt/c/...` to `~/code/...` and reinstall dependencies inside WSL.

### Agent cannot find shared instructions

Check:

```bash
test -f AGENTS.md
cat .claude/CLAUDE.md
cat opencode.json
ls -la .agents/skills
```

### QMD returns stale results

```bash
qmd update
qmd embed
qmd status
```

### Graphify command is unavailable after installation

Restart the shell and confirm the uv tool binary directory is on `PATH`:

```bash
uv tool list
which graphify
```
