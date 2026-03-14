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
});
