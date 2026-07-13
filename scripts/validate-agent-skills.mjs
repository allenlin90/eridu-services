import { access, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { parseDocument } from 'yaml'

const SKILLS_DIRECTORY = '.agents/skills'
const CODEX_FALLBACK_CATALOG_BUDGET = 8_000
const DESCRIPTION_PREFERRED_MIN = 80
const DESCRIPTION_PREFERRED_MAX = 160
const DESCRIPTION_HARD_MAX = 200
const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const LOCAL_LINK_PATTERN = /\[[^\]]*\]\(([^)]+)\)/g

const errors = []
const warnings = []

function parseYaml(source, filePath) {
  const document = parseDocument(source, { uniqueKeys: true })

  for (const error of document.errors) {
    errors.push(`${filePath}: invalid YAML: ${error.message}`)
  }

  return document.errors.length === 0 ? document.toJS() : null
}

function extractFrontmatter(content, filePath) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)

  if (!match) {
    errors.push(`${filePath}: missing YAML frontmatter delimited by ---`)
    return null
  }

  return parseYaml(match[1], filePath)
}

function validateMetadata(metadata, directoryName, filePath) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    errors.push(`${filePath}: frontmatter must be a YAML mapping`)
    return null
  }

  const { name, description } = metadata

  if (typeof name !== 'string' || !NAME_PATTERN.test(name) || name.length > 64) {
    errors.push(
      `${filePath}: name must be 1-64 lowercase letters, numbers, or single hyphens`,
    )
  } else if (name !== directoryName) {
    errors.push(`${filePath}: name "${name}" must match directory "${directoryName}"`)
  }

  if (typeof description !== 'string' || description.trim().length === 0) {
    errors.push(`${filePath}: description must be a non-empty string`)
    return null
  }

  if (description.length > DESCRIPTION_HARD_MAX) {
    errors.push(
      `${filePath}: description exceeds the ${DESCRIPTION_HARD_MAX}-character routing limit`,
    )
  } else if (
    description.length < DESCRIPTION_PREFERRED_MIN ||
    description.length > DESCRIPTION_PREFERRED_MAX
  ) {
    warnings.push(
      `${filePath}: description is ${description.length} characters; ` +
        `prefer ${DESCRIPTION_PREFERRED_MIN}-${DESCRIPTION_PREFERRED_MAX}`,
    )
  }

  return { name, description }
}

function normalizeLinkTarget(rawTarget) {
  const target = rawTarget.trim().replace(/^<|>$/g, '').split(/\s+["']/)[0]

  if (
    target.length === 0 ||
    target.startsWith('#') ||
    target.startsWith('/') ||
    /^[a-z][a-z0-9+.-]*:/i.test(target)
  ) {
    return null
  }

  const fileTarget = target.split('#')[0]

  if (!fileTarget || fileTarget.includes('<') || fileTarget.includes('>')) {
    return null
  }

  try {
    return decodeURIComponent(fileTarget)
  } catch {
    return fileTarget
  }
}

async function validateLocalLinks(content, skillDirectory, filePath) {
  const prose = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '')
    .replace(/`[^`\r\n]*`/g, '')

  for (const match of prose.matchAll(LOCAL_LINK_PATTERN)) {
    const target = normalizeLinkTarget(match[1])

    if (!target) continue

    const resolvedTarget = path.resolve(skillDirectory, target)

    try {
      await access(resolvedTarget)
    } catch {
      errors.push(`${filePath}: linked file does not exist: ${target}`)
    }
  }
}

async function validateCodexMetadata(skillDirectory) {
  const metadataPath = path.join(skillDirectory, 'agents/openai.yaml')

  try {
    const source = await readFile(metadataPath, 'utf8')
    const metadata = parseYaml(source, metadataPath)

    if (metadata && (typeof metadata !== 'object' || Array.isArray(metadata))) {
      errors.push(`${metadataPath}: metadata must be a YAML mapping`)
      return true
    }

    const policy = metadata?.policy
    if (policy === undefined) return true

    if (typeof policy !== 'object' || policy === null || Array.isArray(policy)) {
      errors.push(`${metadataPath}: policy must be a YAML mapping`)
      return true
    }

    const allowImplicitInvocation = policy.allow_implicit_invocation
    if (
      allowImplicitInvocation !== undefined &&
      typeof allowImplicitInvocation !== 'boolean'
    ) {
      errors.push(`${metadataPath}: policy.allow_implicit_invocation must be a boolean`)
      return true
    }

    return allowImplicitInvocation ?? true
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return true
  }
}

async function main() {
  const repositoryRoot = process.cwd()
  const skillsRoot = path.join(repositoryRoot, SKILLS_DIRECTORY)
  const entries = (await readdir(skillsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name))
  const names = new Map()
  let totalDescriptionCharacters = 0
  let implicitDescriptionCharacters = 0
  let explicitOnlySkillCount = 0

  for (const entry of entries) {
    const skillDirectory = path.join(skillsRoot, entry.name)
    const skillPath = path.join(skillDirectory, 'SKILL.md')
    let content

    try {
      content = await readFile(skillPath, 'utf8')
    } catch (error) {
      if (error.code === 'ENOENT') {
        errors.push(`${skillDirectory}: missing SKILL.md`)
        continue
      }

      throw error
    }

    const metadata = extractFrontmatter(content, skillPath)
    const validatedMetadata = validateMetadata(metadata, entry.name, skillPath)
    const allowImplicitInvocation = await validateCodexMetadata(skillDirectory)

    if (validatedMetadata) {
      totalDescriptionCharacters += validatedMetadata.description.length
      if (allowImplicitInvocation) {
        implicitDescriptionCharacters += validatedMetadata.description.length
      } else {
        explicitOnlySkillCount += 1
      }

      const priorPath = names.get(validatedMetadata.name)
      if (priorPath) {
        errors.push(
          `${skillPath}: duplicate skill name "${validatedMetadata.name}" also used by ${priorPath}`,
        )
      } else {
        names.set(validatedMetadata.name, skillPath)
      }
    }

    await validateLocalLinks(content, skillDirectory, skillPath)
  }

  if (implicitDescriptionCharacters > CODEX_FALLBACK_CATALOG_BUDGET) {
    warnings.push(
      `implicitly invocable descriptions use ${implicitDescriptionCharacters.toLocaleString()} characters; ` +
        `Codex may shorten or omit entries beyond its ${CODEX_FALLBACK_CATALOG_BUDGET.toLocaleString()}-character fallback catalog budget`,
    )
  }

  for (const warning of warnings) console.warn(`WARN: ${warning}`)

  if (errors.length > 0) {
    for (const error of errors) console.error(`ERROR: ${error}`)
    console.error(`\nAgent skill validation failed with ${errors.length} error(s).`)
    process.exitCode = 1
    return
  }

  console.log(
    `Validated ${entries.length} skills ` +
      `(${totalDescriptionCharacters.toLocaleString()} total description characters; ` +
      `${implicitDescriptionCharacters.toLocaleString()} implicitly invocable; ` +
      `${explicitOnlySkillCount} explicit-only).`,
  )
}

await main()
