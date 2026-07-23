import {
  SCENE_REVIEW_MODE,
  sceneReviewListItemSchema,
  sceneReviewQuerySchema,
} from '@eridu/api-types/task-management';

describe('sceneReviewQuerySchema', () => {
  const validRange = {
    show_start_from: '2026-07-01T23:00:00.000Z',
    show_start_to: '2026-07-02T22:59:59.999Z',
  };

  it('defaults to Analysis with bounded pagination', () => {
    const result = sceneReviewQuerySchema.parse(validRange);

    expect(result).toEqual(expect.objectContaining({
      mode: SCENE_REVIEW_MODE.ANALYSIS,
      page: 1,
      limit: 20,
      skip: 0,
      take: 20,
    }));
  });

  it('accepts external client and platform UIDs', () => {
    expect(sceneReviewQuerySchema.safeParse({
      ...validRange,
      client_id: 'client_abc123',
      platform_id: 'plt_abc123',
    }).success).toBe(true);
  });

  it('rejects reversed and overlong date ranges', () => {
    expect(sceneReviewQuerySchema.safeParse({
      show_start_from: validRange.show_start_to,
      show_start_to: validRange.show_start_from,
    }).success).toBe(false);
    expect(sceneReviewQuerySchema.safeParse({
      show_start_from: '2026-06-01T23:00:00.000Z',
      show_start_to: '2026-07-03T22:59:59.999Z',
    }).success).toBe(false);
  });

  it('rejects internal numeric IDs', () => {
    expect(sceneReviewQuerySchema.safeParse({
      ...validRange,
      client_id: '123',
      platform_id: '456',
    }).success).toBe(false);
  });
});

describe('sceneReviewListItemSchema', () => {
  it('accepts only external identifiers in queue rows', () => {
    const result = sceneReviewListItemSchema.safeParse({
      task_id: 'task_abc123',
      task_type: 'SETUP',
      status: 'REVIEW',
      submitted_at: null,
      activity_at: '2026-07-02T10:00:00.000Z',
      show: { id: 'show_abc123', name: 'Morning Show', start_time: '2026-07-02T02:00:00.000Z' },
      client: { id: 'client_abc123', name: 'Acme' },
      platforms: [{ id: 'plt_abc123', name: 'TikTok' }],
      metrics: {},
      preview: { key: 'scene', label: 'Scene', url: 'https://example.com/scene.png' },
      evidence_count: 1,
      evidence_labels: ['Scene'],
      reference_available: false,
    });

    expect(result.success).toBe(true);
  });
});
