import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { parseIndexConceptIds, validateRegistryShape } from '../validate-agent-skills.mjs'

const REGISTRY_PATH = '.agents/agent-skill-registry.yaml'

function validSkill(overrides = {}) {
  return {
    kind: 'capability-skill',
    authority: 'procedural',
    implicit: true,
    lifecycle_stage: ['implement'],
    knowledge_sources: [],
    migration_status: 'canonical',
    ...overrides,
  }
}

function validRegistry(overrides = {}) {
  return {
    version: 1,
    implicit_catalog_ceiling: 66,
    implicit_catalog_limit: 50,
    post_consolidation_limit: 35,
    skills: { 'example-skill': validSkill() },
    ...overrides,
  }
}

function shapeErrors(registry) {
  return validateRegistryShape(registry, REGISTRY_PATH, [])
}

describe('validateRegistryShape', () => {
  it('accepts a well-formed registry', () => {
    assert.deepEqual(shapeErrors(validRegistry()), [])
  })

  // Regression: previously `typeof config.implicit === 'boolean'` gated the
  // registry/openai.yaml drift check, so a missing `implicit` silently disabled it.
  for (const field of [
    'kind',
    'authority',
    'implicit',
    'lifecycle_stage',
    'knowledge_sources',
    'migration_status',
  ]) {
    it(`rejects a skill missing "${field}"`, () => {
      const skill = validSkill()
      delete skill[field]
      const found = shapeErrors(validRegistry({ skills: { 'example-skill': skill } }))

      assert.equal(found.length, 1)
      assert.match(found[0], new RegExp(`missing required field "${field}"`))
    })
  }

  const mistyped = [
    ['kind', 42, 'string', 'number'],
    ['authority', ['procedural'], 'string', 'array'],
    ['implicit', 'true', 'boolean', 'string'],
    ['lifecycle_stage', 'implement', 'array', 'string'],
    ['knowledge_sources', 'knowledge/a.md', 'array', 'string'],
    ['migration_status', true, 'string', 'boolean'],
  ]

  for (const [field, value, expected, actual] of mistyped) {
    it(`rejects a skill whose "${field}" is ${actual}, not ${expected}`, () => {
      const skill = validSkill({ [field]: value })
      const found = shapeErrors(validRegistry({ skills: { 'example-skill': skill } }))

      assert.equal(found.length, 1)
      assert.match(found[0], new RegExp(`"${field}" must be ${expected} \\(found ${actual}\\)`))
    })
  }

  it('rejects a skill entry that is not a mapping', () => {
    const found = shapeErrors(validRegistry({ skills: { 'example-skill': ['nope'] } }))

    assert.equal(found.length, 1)
    assert.match(found[0], /must be a mapping/)
  })

  // Regression: a missing or non-numeric ceiling silently disabled the ratchet,
  // so the implicit catalog could grow without failing validation.
  it('rejects a missing implicit_catalog_ceiling', () => {
    const registry = validRegistry()
    delete registry.implicit_catalog_ceiling
    const found = shapeErrors(registry)

    assert.equal(found.length, 1)
    assert.match(found[0], /implicit_catalog_ceiling must be a number \(found undefined\)/)
    assert.match(found[0], /ratchet is disabled/)
  })

  it('rejects a non-numeric implicit_catalog_ceiling', () => {
    const found = shapeErrors(validRegistry({ implicit_catalog_ceiling: '66' }))

    assert.equal(found.length, 1)
    assert.match(found[0], /implicit_catalog_ceiling must be a number \(found string\)/)
  })

  it('rejects a non-numeric optional limit but tolerates its absence', () => {
    const found = shapeErrors(validRegistry({ implicit_catalog_limit: 'fifty' }))
    assert.equal(found.length, 1)
    assert.match(found[0], /implicit_catalog_limit must be a number when present/)

    const registry = validRegistry()
    delete registry.implicit_catalog_limit
    delete registry.post_consolidation_limit
    assert.deepEqual(shapeErrors(registry), [])
  })

  it('reports every offending skill, not just the first', () => {
    const found = shapeErrors(validRegistry({
      skills: {
        a: validSkill({ implicit: 'yes' }),
        b: validSkill({ lifecycle_stage: 'implement' }),
      },
    }))

    assert.equal(found.length, 2)
  })
})

describe('parseIndexConceptIds', () => {
  it('collects concept IDs from markdown link destinations', () => {
    const ids = parseIndexConceptIds(
      '- [db](architecture/database-patterns.md) — rules\n- [show](domain/show-production-lifecycle.md)\n',
    )

    assert.deepEqual(
      [...ids].sort(),
      ['architecture/database-patterns', 'domain/show-production-lifecycle'],
    )
  })

  // Regression: substring matching certified an unindexed concept, because
  // "architecture/database" is a substring of "architecture/database-patterns".
  it('does not let a prefix collision certify an unindexed concept', () => {
    const ids = parseIndexConceptIds('- [db](architecture/database-patterns.md)\n')

    assert.ok(ids.has('architecture/database-patterns'))
    assert.ok(!ids.has('architecture/database'), 'prefix must not match a longer sibling')
  })

  it('strips anchors and leading ./ but keeps distinct concepts distinct', () => {
    const ids = parseIndexConceptIds(
      '[a](./engineering/table-view-pattern.md#current-view-export) [b](engineering/table.md)',
    )

    assert.deepEqual(
      [...ids].sort(),
      ['engineering/table', 'engineering/table-view-pattern'],
    )
  })

  it('ignores external links, anchors, and non-markdown targets', () => {
    const ids = parseIndexConceptIds(
      '[x](https://example.com/a.md) [y](#section) [z](mailto:a@b.co) [w](../scripts/build.mjs)',
    )

    assert.equal(ids.size, 0)
  })
})
