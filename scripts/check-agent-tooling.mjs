import { spawnSync } from 'node:child_process'
import process from 'node:process'

const strict = process.argv.includes('--strict')
const isWindows = process.platform === 'win32'

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
    install: 'Install Node.js 22 or newer.',
  },
  {
    name: 'pnpm',
    level: 'required',
    role: 'workspace package manager',
    command: 'pnpm',
    args: ['--version'],
    install: 'Enable Corepack or install pnpm 10.',
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
    args: ['gain'],
    versionCommand: ['rtk', ['--version']],
    install:
      'Install Rust Token Killer, verify `rtk gain`, then initialize the integration for your agent.',
  },
  {
    name: 'qmd',
    level: 'recommended',
    role: 'local Markdown hybrid search',
    command: 'qmd',
    args: ['--version'],
    install: 'Run `npm install -g @tobilu/qmd`.',
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
    role: 'local code knowledge graph',
    command: 'graphify',
    args: ['--version'],
    install: 'Run `uv tool install graphifyy`.',
  },
  {
    name: 'jq',
    level: 'optional',
    role: 'JSON inspection and hook support',
    command: 'jq',
    args: ['--version'],
    install: 'Install jq from your operating system package manager.',
  },
  {
    name: 'gh',
    level: 'optional',
    role: 'GitHub pull-request and Actions workflows',
    command: 'gh',
    args: ['--version'],
    install: 'Install and authenticate GitHub CLI.',
  },
]

function run(command, args) {
  const result = spawnSync(command, args, {
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

const results = tools.map((tool) => {
  const check = run(tool.command, tool.args)
  let version = check.output

  if (check.ok && tool.versionCommand) {
    const versionCheck = run(tool.versionCommand[0], tool.versionCommand[1])
    if (versionCheck.ok) version = versionCheck.output
  }

  return { ...tool, ok: check.ok, output: version }
})

const levelOrder = ['required', 'recommended', 'optional']

console.log(`Local agent tooling doctor${strict ? ' (strict)' : ''}`)
console.log('')

for (const level of levelOrder) {
  console.log(`${level.toUpperCase()}`)
  for (const result of results.filter((item) => item.level === level)) {
    const marker = result.ok ? 'OK ' : 'MISS'
    const detail = result.ok ? result.output : result.install
    console.log(`  ${marker.padEnd(4)} ${result.name.padEnd(10)} ${result.role}`)
    console.log(`       ${detail}`)
  }
  console.log('')
}

const missingRequired = results.filter((item) => item.level === 'required' && !item.ok)
const missingRecommended = results.filter((item) => item.level === 'recommended' && !item.ok)

if (missingRequired.length > 0) {
  console.error(`Missing required tools: ${missingRequired.map((item) => item.name).join(', ')}`)
  process.exitCode = 1
} else if (strict && missingRecommended.length > 0) {
  console.error(
    `Strict mode: missing recommended tools: ${missingRecommended.map((item) => item.name).join(', ')}`,
  )
  process.exitCode = 1
} else {
  console.log('Required tooling is available.')
  if (missingRecommended.length > 0) {
    console.log(
      `Recommended pilot tools not yet available: ${missingRecommended.map((item) => item.name).join(', ')}`,
    )
  }
}
