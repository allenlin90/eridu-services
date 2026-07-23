import { describe, expect, it } from 'vitest';

import { sceneReviewSearchSchema } from '../scene-review-search-schema';

describe('sceneReviewSearchSchema', () => {
  it('uses stable defaults', () => {
    expect(sceneReviewSearchSchema.parse({})).toEqual({
      mode: 'analysis',
      page: 1,
      limit: 20,
    });
  });

  it('keeps valid shareable filters and selection', () => {
    expect(sceneReviewSearchSchema.parse({
      mode: 'qc-inbox',
      date_from: '2026-07-01',
      date_to: '2026-07-02',
      client_id: 'client_abc123',
      platform_id: 'plt_abc123',
      task_id: 'task_abc123',
      page: '2',
    })).toEqual(expect.objectContaining({
      mode: 'qc-inbox',
      client_id: 'client_abc123',
      platform_id: 'plt_abc123',
      task_id: 'task_abc123',
      page: 2,
    }));
  });

  it('drops malformed optional values', () => {
    expect(sceneReviewSearchSchema.parse({
      date_from: '07/01/2026',
      client_id: '123',
      platform_id: '456',
      task_id: '789',
    })).toEqual({
      mode: 'analysis',
      page: 1,
      limit: 20,
    });
  });
});
