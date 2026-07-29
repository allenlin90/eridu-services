import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

import { SceneQcAuditWriter } from './scene-qc-audit.writer';

import type { UidGeneratorService } from '@/lib/uid/uid-generator.service';

describe('sceneQcAuditWriter', () => {
  let writer: SceneQcAuditWriter;
  let auditCreate: jest.Mock;
  let uidGenerator: jest.Mocked<Pick<UidGeneratorService, 'generateBrandedId'>>;

  beforeEach(() => {
    auditCreate = jest.fn().mockResolvedValue({ uid: 'aud_test1' });
    const txHost = {
      tx: { audit: { create: auditCreate } },
    } as unknown as TransactionHost<TransactionalAdapterPrisma>;
    uidGenerator = {
      generateBrandedId: jest.fn().mockReturnValue('aud_test1'),
    };
    writer = new SceneQcAuditWriter(txHost, uidGenerator as unknown as UidGeneratorService);
  });

  it('never injects AuditService or AuditRepository -- constructor takes only TransactionHost and UidGeneratorService', () => {
    // Structural proof: the constructor signature has exactly two parameters
    // (TransactionHost, UidGeneratorService), so there is no way for
    // AuditService/AuditRepository to reach this class through DI.
    expect(SceneQcAuditWriter.length).toBe(2);
  });

  it('writes exactly one audit.create call with the nested SceneQcAuditTarget junction, an aud_-prefixed uid, and no reason key', async () => {
    await writer.recordSceneProfileChange({
      action: 'CREATE',
      actorId: 42n,
      sceneProfileId: 7n,
      metadata: { event: 'scene_profile_saved' },
    });

    expect(auditCreate).toHaveBeenCalledTimes(1);
    expect(uidGenerator.generateBrandedId).toHaveBeenCalledWith('aud');

    const callArgs = auditCreate.mock.calls[0][0];
    expect(callArgs.data.uid).toBe('aud_test1');
    expect(callArgs.data.action).toBe('CREATE');
    expect(callArgs.data.actor).toEqual({ connect: { id: 42n } });
    expect(callArgs.data.metadata).toEqual({ event: 'scene_profile_saved' });
    expect(callArgs.data.sceneQcTargets).toEqual({
      create: [{ sceneProfile: { connect: { id: 7n } } }],
    });
    expect(callArgs.data).not.toHaveProperty('reason');
    expect(callArgs.select).toEqual({ uid: true });
  });

  it('returns the created audit uid', async () => {
    auditCreate.mockResolvedValue({ uid: 'aud_generated' });

    await expect(
      writer.recordSceneProfileChange({
        action: 'UPDATE',
        actorId: 1n,
        sceneProfileId: 2n,
        metadata: {},
      }),
    ).resolves.toEqual({ uid: 'aud_generated' });
  });

  it.each(['CREATE', 'UPDATE', 'DELETE'] as const)('accepts action %s', async (action) => {
    await writer.recordSceneProfileChange({
      action,
      actorId: 1n,
      sceneProfileId: 2n,
      metadata: {},
    });

    expect(auditCreate.mock.calls[0][0].data.action).toBe(action);
  });

  describe('recordSceneQcReviewChange', () => {
    it('writes exactly one audit.create call with the nested SceneQcAuditTarget junction pointed at sceneQcReview, and no reason key', async () => {
      await writer.recordSceneQcReviewChange({
        action: 'CREATE',
        actorId: 42n,
        sceneQcReviewId: 9n,
        metadata: { event: 'scene_qc_review_saved' },
      });

      expect(auditCreate).toHaveBeenCalledTimes(1);
      const callArgs = auditCreate.mock.calls[0][0];
      expect(callArgs.data.action).toBe('CREATE');
      expect(callArgs.data.actor).toEqual({ connect: { id: 42n } });
      expect(callArgs.data.sceneQcTargets).toEqual({
        create: [{ sceneQcReview: { connect: { id: 9n } } }],
      });
      expect(callArgs.data).not.toHaveProperty('reason');
    });

    it.each(['CREATE', 'UPDATE'] as const)('accepts action %s', async (action) => {
      await writer.recordSceneQcReviewChange({
        action,
        actorId: 1n,
        sceneQcReviewId: 2n,
        metadata: {},
      });

      expect(auditCreate.mock.calls[0][0].data.action).toBe(action);
    });
  });

  describe('recordDailyConfirmation', () => {
    it('writes exactly one audit.create call with the nested SceneQcAuditTarget junction pointed at sceneQcDailyConfirmation, and no reason key', async () => {
      await writer.recordDailyConfirmation({
        action: 'CREATE',
        actorId: 42n,
        sceneQcDailyConfirmationId: 11n,
        metadata: { event: 'scene_qc_day_confirmed' },
      });

      expect(auditCreate).toHaveBeenCalledTimes(1);
      const callArgs = auditCreate.mock.calls[0][0];
      expect(callArgs.data.action).toBe('CREATE');
      expect(callArgs.data.actor).toEqual({ connect: { id: 42n } });
      expect(callArgs.data.sceneQcTargets).toEqual({
        create: [{ sceneQcDailyConfirmation: { connect: { id: 11n } } }],
      });
      expect(callArgs.data).not.toHaveProperty('reason');
    });
  });
});
