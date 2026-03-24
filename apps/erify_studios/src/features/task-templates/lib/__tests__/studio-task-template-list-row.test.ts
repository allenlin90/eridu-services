import { describe, expect, it } from 'vitest';

import { TASK_TEMPLATE_KIND } from '@eridu/api-types/task-management';

import { deriveTaskTemplateKind, toStudioTaskTemplateListRow } from '../studio-task-template-list-row';

describe('studioTaskTemplateListRow', () => {
  it('derives moderation templates from loop metadata and counts shared fields', () => {
    const template = {
      id: 'ttpl_1',
      name: 'Moderation Template',
      description: 'Loop-based workflow',
      task_type: 'ACTIVE',
      is_active: true,
      version: 2,
      created_at: '2026-03-24T00:00:00.000Z',
      updated_at: '2026-03-25T00:00:00.000Z',
      current_schema: {
        items: [
          { id: 'f1', key: 'gmv_l1', type: 'number', label: 'GMV (Loop 1)', standard: true, group: 'l1' },
          { id: 'f2', key: 'custom_loop_field', type: 'checkbox', label: 'Live Title', group: 'l1' },
        ],
        metadata: {
          loops: [{ id: 'l1', name: 'Loop1', durationMin: 15 }],
        },
      },
    } as const;

    expect(deriveTaskTemplateKind(template)).toBe(TASK_TEMPLATE_KIND.MODERATION);
    expect(toStudioTaskTemplateListRow(template)).toMatchObject({
      template_kind: TASK_TEMPLATE_KIND.MODERATION,
      loop_count: 1,
      shared_field_count: 1,
      field_count: 2,
    });
  });

  it('treats templates without loops as standard templates', () => {
    const template = {
      id: 'ttpl_2',
      name: 'Standard Template',
      description: null,
      task_type: 'SETUP',
      is_active: true,
      version: 1,
      created_at: '2026-03-24T00:00:00.000Z',
      updated_at: '2026-03-25T00:00:00.000Z',
      current_schema: {
        items: [{ id: 'f1', key: 'proof_link', type: 'url', label: 'Proof Link', standard: true }],
      },
    } as const;

    expect(deriveTaskTemplateKind(template)).toBe(TASK_TEMPLATE_KIND.STANDARD);
    expect(toStudioTaskTemplateListRow(template)).toMatchObject({
      template_kind: TASK_TEMPLATE_KIND.STANDARD,
      loop_count: 0,
      shared_field_count: 1,
      field_count: 1,
    });
  });
});
