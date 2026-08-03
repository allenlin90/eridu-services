import { access, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { parseDocument } from 'yaml'

const SKILLS_DIRECTORY = '.agents/skills'
const CLAUDE_COMMANDS_DIRECTORY = '.claude/commands'
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

async function validateClaudeCommandNames(repositoryRoot, names) {
  const commandsRoot = path.join(repositoryRoot, CLAUDE_COMMANDS_DIRECTORY)
  let entries

  try {
    entries = await readdir(commandsRoot, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return
    throw error
  }

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue

    const commandName = entry.name.slice(0, -'.md'.length)
    const conflictingSkillPath = names.get(commandName)

    if (conflictingSkillPath) {
      errors.push(
        `${path.join(commandsRoot, entry.name)}: command name "${commandName}" collides with ` +
          `skill ${conflictingSkillPath}; Claude Code resolves slash commands and skills through ` +
          'the same name, so both cannot exist',
      )
    }
  }
}

async function validateRegistry(repositoryRoot, skillEntries, implicitByName) {
  const registryPath = path.join(repositoryRoot, '.agents/agent-skill-registry.yaml')
  let source
  try {
    source = await readFile(registryPath, 'utf8')
  } catch (error) {
    errors.push(`${registryPath}: missing registry file: ${error.message}`)
    return
  }

  const registry = parseYaml(source, registryPath)
  if (!registry || typeof registry !== 'object' || !registry.skills) {
    errors.push(`${registryPath}: invalid or empty registry file structure`)
    return
  }

  const registrySkills = Object.keys(registry.skills)
  const actualSkills = skillEntries.map((e) => e.name)

  for (const skillName of actualSkills) {
    if (!registry.skills[skillName]) {
      errors.push(`${registryPath}: skill directory "${skillName}" is missing from registry`)
    }
  }

  for (const skillName of registrySkills) {
    if (!actualSkills.includes(skillName)) {
      errors.push(`${registryPath}: registered skill "${skillName}" directory does not exist`)
    }
  }

  for (const [skillName, config] of Object.entries(registry.skills)) {
    if (Array.isArray(config.knowledge_sources)) {
      for (const sourcePath of config.knowledge_sources) {
        const resolvedPath = path.resolve(repositoryRoot, sourcePath)
        try {
          await access(resolvedPath)
        } catch {
          errors.push(
            `${registryPath}: skill "${skillName}" references non-existent knowledge source: ${sourcePath}`,
          )
        }
      }
    }

    // `implicit` is the registry's declared routing intent; `agents/openai.yaml`
    // is what Codex actually enforces. Drift between them makes the registry lie.
    const actualImplicit = implicitByName.get(skillName)
    if (actualImplicit !== undefined && typeof config.implicit === 'boolean'
      && config.implicit !== actualImplicit) {
      errors.push(
        `${registryPath}: skill "${skillName}" declares implicit: ${config.implicit} but ` +
          `agents/openai.yaml resolves allow_implicit_invocation: ${actualImplicit}`,
      )
    }
  }

  // Ratchet: `implicit_catalog_ceiling` is the current high-water mark and fails the
  // build on regression. `implicit_catalog_limit` and `post_consolidation_limit` are
  // milestone targets we have not reached yet, so they warn rather than block.
  const implicitCount = [...implicitByName.values()].filter(Boolean).length
  const ceiling = registry.implicit_catalog_ceiling

  if (typeof ceiling === 'number' && implicitCount > ceiling) {
    errors.push(
      `${registryPath}: ${implicitCount} implicitly invocable skills exceed the ` +
        `implicit_catalog_ceiling of ${ceiling}. Set allow_implicit_invocation: false on the ` +
        `new skill, or lower the ceiling deliberately if this growth is intended.`,
    )
  } else if (typeof ceiling === 'number' && implicitCount < ceiling) {
    warnings.push(
      `implicit catalog is down to ${implicitCount} skills; lower implicit_catalog_ceiling ` +
        `from ${ceiling} to ${implicitCount} to lock in the reduction`,
    )
  }

  for (const [field, target] of [
    ['implicit_catalog_limit', registry.implicit_catalog_limit],
    ['post_consolidation_limit', registry.post_consolidation_limit],
  ]) {
    if (typeof target === 'number' && implicitCount > target) {
      warnings.push(
        `${implicitCount} implicitly invocable skills remain above the ${field} target of ${target}`,
      )
    }
  }
}

const KNOWLEDGE_DIRECTORY = 'knowledge'
const OKF_VERSION = '0.2'
const RESERVED_KNOWLEDGE_FILES = new Set(['index.md', 'log.md'])

async function collectKnowledgeConcepts(directory, bundleRoot, found = []) {
  const entries = await readdir(directory, { withFileTypes: true })

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      await collectKnowledgeConcepts(entryPath, bundleRoot, found)
    } else if (entry.name.endsWith('.md') && !RESERVED_KNOWLEDGE_FILES.has(entry.name)) {
      found.push(path.relative(bundleRoot, entryPath))
    }
  }

  return found
}

/**
 * Enforce the strict OKF v0.2 profile from docs/engineering/OKF_AGENT_CONTRACT.md:
 * fenced YAML frontmatter (not body prose), okf_version only at the bundle root,
 * a non-empty `type` and `description` on every concept, and index coverage.
 */
async function validateKnowledgeBundle(repositoryRoot) {
  const bundleRoot = path.join(repositoryRoot, KNOWLEDGE_DIRECTORY)
  const indexPath = path.join(bundleRoot, 'index.md')

  let indexContent
  try {
    indexContent = await readFile(indexPath, 'utf8')
  } catch {
    errors.push(`${indexPath}: knowledge bundle root index.md is missing`)
    return
  }

  const indexMetadata = extractFrontmatter(indexContent, indexPath)
  if (indexMetadata && indexMetadata.okf_version !== OKF_VERSION) {
    errors.push(
      `${indexPath}: bundle root must declare okf_version: "${OKF_VERSION}" in frontmatter ` +
        `(found ${JSON.stringify(indexMetadata.okf_version)})`,
    )
  }

  const concepts = await collectKnowledgeConcepts(bundleRoot, bundleRoot)

  for (const relativePath of concepts.sort()) {
    const conceptPath = path.join(bundleRoot, relativePath)
    const content = await readFile(conceptPath, 'utf8')
    const metadata = extractFrontmatter(content, conceptPath)

    if (!metadata) continue

    if (typeof metadata.type !== 'string' || metadata.type.trim().length === 0) {
      errors.push(`${conceptPath}: strict OKF v0.2 concept requires a non-empty type`)
    }

    if (typeof metadata.description !== 'string' || metadata.description.trim().length === 0) {
      errors.push(`${conceptPath}: concept requires a one-sentence description`)
    }

    if ('okf_version' in metadata) {
      errors.push(
        `${conceptPath}: only the bundle-root index.md carries okf_version`,
      )
    }

    const conceptId = relativePath.replace(/\.md$/, '')
    if (!indexContent.includes(relativePath) && !indexContent.includes(conceptId)) {
      errors.push(`${indexPath}: concept "${conceptId}" is not listed in the bundle index`)
    }
  }
}

async function main() {
  const repositoryRoot = process.cwd()
  const skillsRoot = path.join(repositoryRoot, SKILLS_DIRECTORY)
  const entries = (await readdir(skillsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name))
  const names = new Map()
  const implicitByName = new Map()
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
    implicitByName.set(entry.name, allowImplicitInvocation)

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

  await validateClaudeCommandNames(repositoryRoot, names)
  await validateRegistry(repositoryRoot, entries, implicitByName)
  await validateKnowledgeBundle(repositoryRoot)

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

