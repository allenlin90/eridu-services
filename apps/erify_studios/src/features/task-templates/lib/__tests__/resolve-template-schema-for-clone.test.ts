import { describe, expect, it } from 'vitest';

import {
  safeParseTemplateSchema,
  TASK_TEMPLATE_FIELD_ID_PATTERN,
  type TaskTemplateDto,
} from '@eridu/api-types/task-management';

import { resolveTemplateSchemaForClone } from '../resolve-template-schema-for-clone';

function makeTemplate(currentSchema: Record<string, unknown>): TaskTemplateDto {
  return {
    id: 'ttpl_source',
    name: 'Source',
    description: 'Source template',
    task_type: 'ACTIVE',
    is_active: true,
    version: 1,
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
    current_schema: currentSchema,
  } as TaskTemplateDto;
}

describe('resolveTemplateSchemaForClone', () => {
  it('preserves v2 engine markers so the backend validator keeps the v2 path', () => {
    const template = makeTemplate({
      schema_version: 2,
      schema_engine: 'task_template_v2',
      content_key_strategy: 'field_id',
      report_projection_strategy: 'descriptor',
      items: [
        {
          id: 'fld_aaaaaaaaaa',
          key: 'gmv',
          type: 'number',
          label: 'GMV',
          shared_field_key: 'gmv',
          group: 'l1',
        },
      ],
      metadata: {
        task_type: 'ACTIVE',
        loops: [{ id: 'l1', name: 'Loop 1', durationMin: 15 }],
      },
    });

    const cloned = resolveTemplateSchemaForClone(template) as Record<string, unknown>;

    expect(cloned.schema_engine).toBe('task_template_v2');
    expect(cloned.schema_version).toBe(2);
    expect(cloned.content_key_strategy).toBe('field_id');
    expect(cloned.report_projection_strategy).toBe('descriptor');
  });

  it('regenerates v2 field IDs using the fld_ pattern the v2 validator requires', () => {
    const template = makeTemplate({
      schema_version: 2,
      schema_engine: 'task_template_v2',
      items: [
        { id: 'fld_aaaaaaaaaa', key: 'gmv', type: 'number', label: 'GMV', shared_field_key: 'gmv', group: 'l1' },
      ],
      metadata: {
        task_type: 'ACTIVE',
        loops: [{ id: 'l1', name: 'Loop 1', durationMin: 15 }],
      },
    });

    const cloned = resolveTemplateSchemaForClone(template) as { items: { id: string }[] };

    expect(cloned.items[0].id).toMatch(TASK_TEMPLATE_FIELD_ID_PATTERN);
    expect(cloned.items[0].id).not.toBe('fld_aaaaaaaaaa');
  });

  it('produces a v2 clone payload that passes the shared backend validator', () => {
    const template = makeTemplate({
      schema_version: 2,
      schema_engine: 'task_template_v2',
      content_key_strategy: 'field_id',
      report_projection_strategy: 'descriptor',
      items: [
        { id: 'fld_aaaaaaaaaa', key: 'gmv', type: 'number', label: 'GMV', shared_field_key: 'gmv', group: 'l1' },
        { id: 'fld_bbbbbbbbbb', key: 'notes', type: 'textarea', label: 'Notes', group: 'l1' },
      ],
      metadata: {
        task_type: 'ACTIVE',
        loops: [{ id: 'l1', name: 'Loop 1', durationMin: 15 }],
      },
    });

    const cloned = resolveTemplateSchemaForClone(template);
    const result = safeParseTemplateSchema(cloned);

    expect(result.success).toBe(true);
  });

  it('clones v1 templates with randomized ids and no engine markers', () => {
    const template = makeTemplate({
      items: [{ id: 'f1', key: 'proof_link', type: 'url', label: 'Proof Link', standard: true }],
    });

    const cloned = resolveTemplateSchemaForClone(template) as Record<string, unknown>;

    expect(cloned.schema_engine).toBeUndefined();
    expect(cloned.schema_version).toBeUndefined();
    expect((cloned.items as { id: string }[])[0].id).not.toBe('f1');
  });
});
