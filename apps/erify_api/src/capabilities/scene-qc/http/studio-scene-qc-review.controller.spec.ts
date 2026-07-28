import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { SceneQcWorkflowService } from '../scene-qc-review-workflow.service';

import { StudioSceneQcReviewController } from './studio-scene-qc-review.controller';

import { STUDIO_ROLES_KEY } from '@/lib/decorators/studio-protected.decorator';

describe('studioSceneQcReviewController', () => {
  let controller: StudioSceneQcReviewController;
  let workflowService: jest.Mocked<SceneQcWorkflowService>;

  const studioId = 'std_1';
  const user = { ext_id: 'ext_actor_1', id: 'ext_actor_1' } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudioSceneQcReviewController],
      providers: [
        {
          provide: SceneQcWorkflowService,
          useValue: {
            createReview: jest.fn(),
            updateReview: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(StudioSceneQcReviewController);
    workflowService = module.get(SceneQcWorkflowService);
  });

  it('grants access to DESIGNER, MANAGER, and ADMIN only', () => {
    const roles = Reflect.getMetadata(STUDIO_ROLES_KEY, StudioSceneQcReviewController);
    expect(roles).toEqual([STUDIO_ROLE.DESIGNER, STUDIO_ROLE.MANAGER, STUDIO_ROLE.ADMIN]);
  });

  it('exposes exactly POST/PATCH at studios/:studioId/scene-qc-reviews', () => {
    const path = Reflect.getMetadata('path', StudioSceneQcReviewController);
    expect(path).toBe('studios/:studioId/scene-qc-reviews');
    for (const method of ['create', 'update'] as const) {
      expect(typeof controller[method]).toBe('function');
    }
  });

  describe('create', () => {
    const body = { show_id: 'show_1', operational_date: '2026-06-01', result: 'PASS', feedback: null } as any;

    it('delegates to createReview with the actor ext_id and studio uid as mutation context', async () => {
      const created = { uid: 'scqcr_1' } as any;
      workflowService.createReview.mockResolvedValue(created);

      const result = await controller.create(user, studioId, body);

      expect(workflowService.createReview).toHaveBeenCalledWith(studioId, body, {
        actorExtId: user.ext_id,
        studioUid: studioId,
      });
      expect(result).toBe(created);
    });

    it('passes through a 409 conflict raised by the workflow unchanged', async () => {
      const conflict = Object.assign(new Error('conflict'), { status: 409 });
      workflowService.createReview.mockRejectedValue(conflict);

      await expect(controller.create(user, studioId, body)).rejects.toBe(conflict);
    });

    it('passes through a 422 (no evidence) raised by the workflow unchanged', async () => {
      const unprocessable = Object.assign(new Error('no evidence'), { status: 422 });
      workflowService.createReview.mockRejectedValue(unprocessable);

      await expect(controller.create(user, studioId, body)).rejects.toBe(unprocessable);
    });
  });

  describe('update', () => {
    const body = { result: 'MINOR', feedback: 'watermark visible', version: 1 } as any;

    it('delegates to updateReview with the review uid, actor ext_id, and studio uid', async () => {
      const updated = { uid: 'scqcr_1', version: 2 } as any;
      workflowService.updateReview.mockResolvedValue(updated);

      const result = await controller.update(user, studioId, 'scqcr_1', body);

      expect(workflowService.updateReview).toHaveBeenCalledWith(studioId, 'scqcr_1', body, {
        actorExtId: user.ext_id,
        studioUid: studioId,
      });
      expect(result).toBe(updated);
    });

    it('passes through a 409 conflict (confirmed or stale version) raised by the workflow unchanged', async () => {
      const conflict = Object.assign(new Error('confirmed'), { status: 409 });
      workflowService.updateReview.mockRejectedValue(conflict);

      await expect(controller.update(user, studioId, 'scqcr_1', body)).rejects.toBe(conflict);
    });
  });
});
