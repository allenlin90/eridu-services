import { existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import process from 'node:process'

const rawArgs = process.argv.slice(2)
const allowedArgs = new Set(['--strict', '--all-agents', '--runtime-only', '--help'])
const unknownArgs = rawArgs.filter((arg) => !allowedArgs.has(arg))

function printHelp() {
  console.log(`Usage: pnpm agents:doctor [options]

Options:
  --strict        Fail when recommended tools or RTK readiness are missing
  --all-agents    Require Claude Code, Codex, and OpenCode
  --runtime-only  Skip the primary-agent requirement
  --help          Show this help
`)
}

if (unknownArgs.length > 0) {
  console.error(`ERROR: unknown option${unknownArgs.length === 1 ? '' : 's'}: ${unknownArgs.join(', ')}`)
  printHelp()
  process.exit(1)
}

const args = new Set(rawArgs)
const strict = args.has('--strict')
const allAgents = args.has('--all-agents')
const runtimeOnly = args.has('--runtime-only')
const isWindows = process.platform === 'win32'

if (args.has('--help')) {
  printHelp()
  process.exit(0)
}

if (allAgents && runtimeOnly) {
  console.error('ERROR: --all-agents and --runtime-only cannot be used together.')
  process.exit(1)
}

function detectWsl() {
  if (process.platform !== 'linux') return false
  if (process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP) return true

  try {
    return /microsoft/i.test(readFileSync('/proc/version', 'utf8'))
  } catch {
    return false
  }
}

const isWsl = detectWsl()

const tools = [
  {
    name: 'git',
    level: 'required',
    role: 'source history and repository operations',
    command: 'git',
    args: ['--version'],
    install: 'Install Git from your operating system package manager.',
  },
  {
    name: 'node',
    level: 'required',
    role: 'monorepo runtime',
    command: 'node',
    args: ['--version'],
    minimumMajor: 22,
    install: 'Install Node.js 22 or newer.',
  },
  {
    name: 'pnpm',
    level: 'required',
    role: 'workspace package manager',
    command: 'pnpm',
    args: ['--version'],
    requiredMajor: 10,
    install: 'Install pnpm 10; this repo declares pnpm@10.32.1.',
  },
  {
    name: 'rg',
    level: 'recommended',
    role: 'exact repository search',
    command: 'rg',
    args: ['--version'],
    install: 'Install ripgrep.',
  },
  {
    name: 'rtk',
    level: 'recommended',
    role: 'token-optimized shell output',
    command: 'rtk',
    args: ['--version'],
    install: 'Install Rust Token Killer, then initialize it for the selected agent.',
  },
  {
    name: 'qmd',
    level: 'recommended',
    role: 'local Markdown and OKF hybrid search',
    command: 'qmd',
    args: ['--version'],
    install: 'Run `npm install -g @tobilu/qmd`.',
  },
  {
    name: 'jq',
    level: 'recommended',
    role: 'JSON inspection and shell-integration support',
    command: 'jq',
    args: ['--version'],
    install: 'Install jq from your operating system package manager.',
  },
  {
    name: 'uv',
    level: 'optional',
    role: 'isolated Python CLI installation',
    command: 'uv',
    args: ['--version'],
    install: 'Install uv before using the recommended Graphify installation.',
  },
  {
    name: 'graphify',
    level: 'optional',
    role: 'local structural code graph',
    command: 'graphify',
    args: ['--version'],
    install: 'Run `uv tool install graphifyy`.',
  },
  {
    name: 'gh',
    level: 'optional',
    role: 'GitHub pull-request and Actions workflows',
    command: 'gh',
    args: ['--version'],
    install: 'Install and authenticate GitHub CLI.',
  },
  {
    name: 'docker',
    level: 'optional',
    role: 'local service-stack and integration testing',
    command: 'docker',
    args: ['--version'],
    install: 'Install Docker Desktop on macOS/Windows or Docker Engine inside Linux.',
  },
]

const primaryAgents = [
  {
    name: 'claude',
    role: 'Claude Code',
    command: 'claude',
    args: ['--version'],
    install: 'Run `npm install -g @anthropic-ai/claude-code`.',
  },
  {
    name: 'codex',
    role: 'OpenAI Codex',
    command: 'codex',
    args: ['--version'],
    install: 'Run `npm install -g @openai/codex`.',
  },
  {
    name: 'opencode',
    role: 'OpenCode',
    command: 'opencode',
    args: ['--version'],
    install: 'Run `npm install -g opencode-ai` or use the OpenCode Homebrew tap.',
  },
]

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    encoding: 'utf8',
    shell: isWindows,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  if (result.error || result.status !== 0) {
    return {
      ok: false,
      output: (result.stderr || result.stdout || result.error?.message || '').trim(),
    }
  }

  return {
    ok: true,
    output: (result.stdout || result.stderr || '').trim().split(/\r?\n/, 1)[0],
  }
}

function parseMajor(output) {
  const match = output.match(/(?:^|\s)v?(\d+)(?:\.\d+)?/)
  return match ? Number(match[1]) : null
}

function checkCommand(definition) {
  const check = run(definition.command, definition.args)
  const major = check.ok ? parseMajor(check.output) : null
  let compatible = check.ok
  let compatibilityNote = ''

  if (check.ok && definition.minimumMajor && major !== null && major < definition.minimumMajor) {
    compatible = false
    compatibilityNote = `Found major ${major}; requires >=${definition.minimumMajor}.`
  }

  if (check.ok && definition.requiredMajor && major !== null && major !== definition.requiredMajor) {
    compatible = false
    compatibilityNote = `Found major ${major}; requires major ${definition.requiredMajor}.`
  }

  return {
    ...definition,
    installed: check.ok,
    ok: compatible,
    output: check.output,
    compatibilityNote,
  }
}

function readText(filePath) {
  try {
    return readFileSync(filePath, 'utf8')
  } catch {
    return ''
  }
}

const results = tools.map(checkCommand)
const agentResults = primaryAgents.map(checkCommand)
const rtkResult = results.find((item) => item.name === 'rtk')
const rtkReadiness = rtkResult?.ok
  ? run('rtk', ['gain'])
  : { ok: false, skipped: true, output: 'Install RTK before checking initialization.' }

const rootInstructions = readText('AGENTS.md')
const opencodeConfig = readText('opencode.json')
const claudeAdapter = readText('.claude/CLAUDE.md')
const repositoryChecks = [
  {
    name: 'AGENTS.md',
    ok: existsSync('AGENTS.md'),
    detail: 'canonical shared runtime instructions',
  },
  {
    name: 'Agent taxonomy',
    ok: existsSync('.agents/README.md'),
    detail: '.agents/README.md owns content classification and bookkeeping',
  },
  {
    name: 'Agent routes',
    ok:
      rootInstructions.includes('.agents/README.md') &&
      rootInstructions.includes('AGENT_OPERATING_MODEL.md') &&
      rootInstructions.includes('AGENT_INVOCATION_COMPATIBILITY.md'),
    detail: 'AGENTS.md routes supported clients to the deeper agent contracts',
  },
  {
    name: 'Claude adapter',
    ok: claudeAdapter.includes('@../AGENTS.md'),
    detail: '.claude/CLAUDE.md imports AGENTS.md',
  },
  {
    name: 'OpenCode adapter',
    ok: opencodeConfig.includes('AGENTS.md') && opencodeConfig.includes('.agents/rules/*.mdc'),
    detail: 'opencode.json loads shared instructions and rules',
  },
  {
    name: 'Skill source',
    ok: existsSync('.agents/skills'),
    detail: '.agents/skills exists for native/shared discovery',
  },
  {
    name: 'OKF contract',
    ok: existsSync('docs/engineering/OKF_AGENT_CONTRACT.md'),
    detail: 'shared strict-v0.2 and legacy compatibility contract exists',
  },
]

const platform = isWsl
  ? `WSL2 (${process.env.WSL_DISTRO_NAME || 'Linux'})`
  : `${process.platform}/${process.arch}`

console.log(
  `Agentic development doctor${strict ? ' (strict)' : ''}${allAgents ? ' (all agents)' : ''}`,
)
console.log(`Platform: ${platform}`)
console.log(`Working directory: ${process.cwd()}`)
console.log('')

if (isWsl && /^\/mnt\/[a-z]\//i.test(process.cwd())) {
  console.warn(
    'WARN: repository is under /mnt/<drive>. Prefer ~/code/... for watcher and filesystem performance.',
  )
  console.log('')
}

for (const level of ['required', 'recommended', 'optional']) {
  console.log(`${level.toUpperCase()}`)

  for (const result of results.filter((item) => item.level === level)) {
    const marker = result.ok ? 'OK' : result.installed ? 'BAD' : 'MISS'
    const detail = result.ok ? result.output : result.compatibilityNote || result.install
    console.log(`  ${marker.padEnd(4)} ${result.name.padEnd(10)} ${result.role}`)
    console.log(`       ${detail}`)
  }

  console.log('')
}

console.log('RTK READINESS')
if (!rtkResult?.ok) {
  console.log('  SKIP RTK is not installed or is incompatible.')
} else if (rtkReadiness.ok) {
  console.log('  OK   `rtk gain` completed successfully.')
  if (rtkReadiness.output) console.log(`       ${rtkReadiness.output}`)
} else {
  console.log('  WARN RTK is installed, but `rtk gain` failed.')
  console.log('       Initialize RTK for the selected agent, then rerun the doctor.')
  if (rtkReadiness.output) console.log(`       ${rtkReadiness.output}`)
}
console.log('')

console.log('PRIMARY AGENTS')
for (const result of agentResults) {
  const marker = result.ok ? 'OK' : 'MISS'
  console.log(`  ${marker.padEnd(4)} ${result.name.padEnd(10)} ${result.role}`)
  console.log(`       ${result.ok ? result.output : result.install}`)
}
console.log('')

console.log('REPOSITORY ADAPTERS')
for (const check of repositoryChecks) {
  console.log(`  ${(check.ok ? 'OK' : 'BAD').padEnd(4)} ${check.name.padEnd(24)} ${check.detail}`)
}
console.log('')

const missingRequired = results.filter((item) => item.level === 'required' && !item.ok)
const missingRecommended = results.filter((item) => item.level === 'recommended' && !item.ok)
const installedAgents = agentResults.filter((item) => item.ok)
const missingAgents = agentResults.filter((item) => !item.ok)
const failedRepositoryChecks = repositoryChecks.filter((item) => !item.ok)

const errors = []

if (missingRequired.length > 0) {
  errors.push(
    `missing or incompatible required tools: ${missingRequired.map((item) => item.name).join(', ')}`,
  )
}

if (!runtimeOnly && installedAgents.length === 0) {
  errors.push('no primary coding agent installed; install Claude Code, Codex, or OpenCode')
}

if (allAgents && missingAgents.length > 0) {
  errors.push(`missing primary agents: ${missingAgents.map((item) => item.name).join(', ')}`)
}

if (strict && missingRecommended.length > 0) {
  errors.push(
    `missing recommended tools: ${missingRecommended.map((item) => item.name).join(', ')}`,
  )
}

if (strict && rtkResult?.ok && !rtkReadiness.ok) {
  errors.push('RTK is installed but not ready; `rtk gain` failed')
}

if (failedRepositoryChecks.length > 0) {
  errors.push(
    `repository adapter checks failed: ${failedRepositoryChecks.map((item) => item.name).join(', ')}`,
  )
}

if (errors.length > 0) {
  for (const error of errors) console.error(`ERROR: ${error}`)
  console.error('See docs/engineering/AGENTIC_DEVELOPMENT_SETUP.md for macOS and WSL setup.')
  process.exitCode = 1
} else {
  console.log('Agentic development environment is ready for the selected validation level.')

  if (!strict && missingRecommended.length > 0) {
    console.log(
      `Recommended tools not yet available: ${missingRecommended.map((item) => item.name).join(', ')}`,
    )
  }

  if (!strict && rtkResult?.ok && !rtkReadiness.ok) {
    console.log('RTK is installed but still needs agent initialization.')
  }

  if (!allAgents && missingAgents.length > 0) {
    console.log(
      `Other supported primary agents not installed: ${missingAgents.map((item) => item.name).join(', ')}`,
    )
  }
}
