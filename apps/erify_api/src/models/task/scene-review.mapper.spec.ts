import type { TaskSceneReviewCandidate } from './scene-review.mapper';
import { mapSceneReviewCandidate, mapSceneReviewDetail } from './scene-review.mapper';

function createCandidate(overrides: Partial<TaskSceneReviewCandidate> = {}): TaskSceneReviewCandidate {
  return {
    uid: 'task_abc123',
    type: 'SETUP',
    status: 'REVIEW',
    content: {
      screenshot: 'https://assets.example.com/final.webp?version=2',
      duplicate: 'https://assets.example.com/final.webp?version=2',
      gmv: 12500,
      viewers: 4800,
      ctr: '4.2%',
      cto: '1.1%',
    },
    metadata: null,
    updatedAt: new Date('2026-07-02T10:00:00.000Z'),
    snapshot: {
      schema: {
        items: [
          { id: 'screenshot', key: 'screenshot', type: 'file', label: 'Final screenshot', validation: { accept: 'image/*' } },
          { id: 'duplicate', key: 'duplicate', type: 'file', label: 'Duplicate', validation: { accept: 'image/*' } },
          { id: 'gmv', key: 'gmv', type: 'number', label: 'GMV' },
          { id: 'viewers', key: 'viewers', type: 'number', label: 'Viewer count' },
          { id: 'ctr', key: 'ctr', type: 'number', label: 'Platform CTR' },
          { id: 'cto', key: 'cto', type: 'number', label: 'Click to order' },
        ],
      },
    },
    targets: [{
      show: {
        uid: 'show_abc123',
        name: 'Morning Show',
        startTime: new Date('2026-07-02T02:00:00.000Z'),
        client: { uid: 'client_abc123', name: 'Acme' },
        showCreators: [],
        showPlatforms: [{
          uid: 'show_platform_abc123',
          platform: { uid: 'plt_abc123', name: 'TikTok' },
        }],
      },
    }],
    ...overrides,
  };
}

describe('scene review mapper', () => {
  it('maps de-duplicated image evidence, metrics, and external context', () => {
    const result = mapSceneReviewDetail(createCandidate({
      content: {
        screenshot: 'https://assets.example.com/final.webp?version=2',
        duplicate: 'https://assets.example.com/final.webp?version=2',
        gmv: 12500,
        viewers: 4800,
        ctr: '4.2%',
        cto: '1.1%',
        private_notes: 'Do not expose this task answer to Designers',
      },
    }));

    expect(result).toEqual(expect.objectContaining({
      task_id: 'task_abc123',
      submitted_at: null,
      client: { id: 'client_abc123', name: 'Acme' },
      platforms: [{ id: 'plt_abc123', name: 'TikTok' }],
      metrics: { gmv: '12500', viewers: '4800', ctr: '4.2%', cto: '1.1%' },
    }));
    expect(result?.evidence).toEqual([{
      key: 'screenshot',
      label: 'Final screenshot',
      url: 'https://assets.example.com/final.webp?version=2',
    }]);
    expect(result).not.toHaveProperty('schema');
    expect(result).not.toHaveProperty('content');
    expect(result).not.toHaveProperty('hydration_context');
  });

  it('uses recursive image discovery only without a valid frozen schema', () => {
    const result = mapSceneReviewCandidate(createCandidate({
      snapshot: null,
      content: {
        gallery: ['javascript:alert(1)', { url: 'https://assets.example.com/qc.png?version=2' }],
      },
    }));

    expect(result?.preview.url).toBe('https://assets.example.com/qc.png?version=2');
    expect(result?.metrics).toEqual({});
  });

  it('returns null when the task has no safe image or show target', () => {
    expect(mapSceneReviewCandidate(createCandidate({ content: {}, snapshot: null }))).toBeNull();
    expect(mapSceneReviewCandidate(createCandidate({ targets: [] }))).toBeNull();
  });

  it('derives submitted_at only from a proven transition into REVIEW', () => {
    const transitionAt = '2026-07-02T09:30:00.000Z';
    expect(mapSceneReviewCandidate(createCandidate({
      metadata: { audit: { last_transition: { to: 'REVIEW', at: transitionAt } } },
    }))?.submitted_at).toBe(transitionAt);
    expect(mapSceneReviewCandidate(createCandidate({
      status: 'COMPLETED',
      metadata: { audit: { last_transition: { to: 'COMPLETED', at: transitionAt } } },
    }))?.submitted_at).toBeNull();
  });
});
