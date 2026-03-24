import { listTaskTemplatesQuerySchema } from './task-template.schema';

describe('taskTemplateQuerySchema', () => {
  it('rejects list query limit above max cap', () => {
    const result = listTaskTemplatesQuerySchema.safeParse({
      page: 1,
      limit: 101,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('limit');
    }
  });

  it('transforms studio task-template filters to service-friendly query fields', () => {
    const result = listTaskTemplatesQuerySchema.parse({
      page: 2,
      limit: 20,
      name: 'moderation',
      task_type: 'ACTIVE',
      template_kind: 'moderation',
      is_active: 'true',
      include_deleted: 'false',
      sort: 'name:asc',
    });

    expect(result).toMatchObject({
      page: 2,
      limit: 20,
      skip: 20,
      take: 20,
      name: 'moderation',
      taskType: 'ACTIVE',
      templateKind: 'moderation',
      isActive: true,
      includeDeleted: false,
      sort: 'name:asc',
    });
  });
});
