import { describe, expect, it } from 'vitest';

import { getFieldContentKey } from '@eridu/api-types/task-management';

import { resolveUiSchema } from '@/features/tasks/lib/resolve-ui-schema';

const BASE_ITEM = {
  id: 'field-1',
  key: 'pin_welcome',
  type: 'checkbox',
  label: 'Pin welcome comment',
  required: true,
};

describe('resolveUiSchema', () => {
  it('parses direct ui schema shape', () => {
    const result = resolveUiSchema({
      items: [BASE_ITEM],
      metadata: { loops: [{ id: 'l1', name: 'Loop 1', durationMin: 15 }] },
    });

    expect(result).not.toBeNull();
    expect(result?.items).toHaveLength(1);
  });

  it('parses wrapped full template schema shape', () => {
    const result = resolveUiSchema({
      name: 'Moderation Template',
      description: 'Wrapped shape',
      task_type: 'ACTIVE',
      items: [BASE_ITEM],
      metadata: { loops: [{ id: 'l1', name: 'Loop 1', durationMin: 15 }] },
    });

    expect(result).not.toBeNull();
    expect(result?.items[0]?.key).toBe('pin_welcome');
  });

  it('parses nested schema container', () => {
    const result = resolveUiSchema({
      schema: {
        items: [BASE_ITEM],
      },
    });

    expect(result).not.toBeNull();
    expect(result?.items).toHaveLength(1);
  });

  it('preserves v2 engine metadata and field ids', () => {
    const result = resolveUiSchema({
      schema_version: 2,
      schema_engine: 'task_template_v2',
      content_key_strategy: 'field_id',
      report_projection_strategy: 'descriptor',
      items: [{
        id: 'fld_abc123def4',
        key: 'notes',
        type: 'textarea',
        label: 'Notes',
        required: false,
      }],
      metadata: {},
    });

    expect(result).not.toBeNull();
    expect(result?.schema_engine).toBe('task_template_v2');
    expect(result?.items[0]?.id).toBe('fld_abc123def4');
    expect(result ? getFieldContentKey(result, result.items[0]!) : null).toBe('fld_abc123def4');
  });

  it('returns null for invalid schema', () => {
    const result = resolveUiSchema({
      items: [{ id: 'bad', type: 'checkbox' }],
    });

    expect(result).toBeNull();
  });
});
