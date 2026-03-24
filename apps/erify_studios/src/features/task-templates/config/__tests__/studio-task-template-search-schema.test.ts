import { describe, expect, it } from 'vitest';

import { studioTaskTemplateSearchSchema } from '../studio-task-template-search-schema';

describe('studioTaskTemplateSearchSchema', () => {
  it('parses pagination and filter query params for the studio task-template table', () => {
    expect(studioTaskTemplateSearchSchema.parse({
      page: '2',
      limit: '20',
      name: 'moderation',
      template_kind: 'moderation',
      task_type: 'ACTIVE',
      is_active: 'true',
    })).toEqual({
      page: 2,
      limit: 20,
      name: 'moderation',
      template_kind: 'moderation',
      task_type: 'ACTIVE',
      is_active: 'true',
    });
  });
});
