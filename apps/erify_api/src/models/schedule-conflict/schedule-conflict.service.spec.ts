import { Module } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';

import { ScheduleConflictService } from './schedule-conflict.service';

import { AuditService } from '@/models/audit/audit.service';
import { PrismaService } from '@/prisma/prisma.service';
import { UtilityService } from '@/utility/utility.service';

let mockTx: { $executeRaw: jest.Mock; showType: { findMany: jest.Mock } };
const mockPrismaForCls = {
  $transaction: jest.fn(async (callback: any) => callback(mockTx)),
};

@Module({
  providers: [{ provide: PrismaService, useValue: mockPrismaForCls }],
  exports: [PrismaService],
})
class MockPrismaModule {}

describe('scheduleConflictService', () => {
  let service: ScheduleConflictService;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    mockTx = {
      $executeRaw: jest.fn().mockResolvedValue(undefined),
      showType: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ClsModule.forRoot({
          plugins: [new ClsPluginTransactional({ adapter: new TransactionalAdapterPrisma({ prismaInjectionToken: PrismaService }), imports: [MockPrismaModule] })],
        }),
      ],
      providers: [
        ScheduleConflictService,
        { provide: AuditService, useValue: {
          create: jest.fn().mockResolvedValue({ uid: 'aud_new' }),
          findLatestScheduleConflictForShow: jest.fn().mockResolvedValue(null),
        } },
        { provide: UtilityService, useValue: { generateBrandedId: jest.fn().mockReturnValue('conflict_fresh1') } },
      ],
    }).compile();

    service = module.get(ScheduleConflictService);
    auditService = module.get(AuditService);
  });

  const baseParams = {
    showId: BigInt(1),
    scheduleUid: 'schedule_1',
    externalId: 'EXT-1',
    actorId: BigInt(9),
    conflictType: 'update_held_back' as const,
  };

  it('opens a fresh conflict when nothing is pending and something is held back', async () => {
    const heldBack = {
      showFields: { changedFields: ['name'], old: { name: 'A' }, new: { name: 'B' } },
      showCreators: [],
      showPlatforms: [],
      proposedStatusTransition: null,
    };

    const result = await service.reconcileShowConflict({ ...baseParams, heldBack });

    expect(result.recorded).toBe(true);
    expect(auditService.create).toHaveBeenCalledWith(expect.objectContaining({
      action: 'OVERRIDE',
      metadata: expect.objectContaining({
        event: 'schedule_publish_impact',
        impact_kind: 'stale_conflict',
        lifecycle: 'opened',
        conflict_type: 'update_held_back',
        conflict_uid: 'conflict_fresh1',
      }),
      targets: [{ targetType: 'SHOW', targetId: BigInt(1) }],
    }));
  });

  it('does nothing when nothing is pending and nothing is held back', async () => {
    const result = await service.reconcileShowConflict({ ...baseParams, heldBack: null });

    expect(result.recorded).toBe(false);
    expect(auditService.create).not.toHaveBeenCalled();
  });

  it('auto-resolves a pending conflict as no-longer-conflicting when nothing is held back this run', async () => {
    auditService.findLatestScheduleConflictForShow.mockResolvedValue({
      uid: 'aud_old',
      createdAt: new Date(),
      metadata: {
        event: 'schedule_publish_impact',
        impact_kind: 'stale_conflict',
        lifecycle: 'opened',
        conflict_uid: 'conflict_old1',
        conflict_type: 'update_held_back',
        held_back: { show_fields: { changed_fields: ['name'], old: { name: 'A' }, new: { name: 'B' } }, show_creators: [], show_platforms: [], proposed_status_transition: null },
      },
    } as any);

    const result = await service.reconcileShowConflict({ ...baseParams, heldBack: null });

    expect(result.recorded).toBe(false);
    expect(auditService.create).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        lifecycle: 'resolved',
        outcome: 'auto_resolved_no_longer_conflicting',
        resolves_conflict_uid: 'conflict_old1',
      }),
    }));
  });

  it('supersedes a pending conflict and opens a fresh one when the diff changed', async () => {
    auditService.findLatestScheduleConflictForShow.mockResolvedValue({
      uid: 'aud_old',
      createdAt: new Date(),
      metadata: {
        event: 'schedule_publish_impact',
        impact_kind: 'stale_conflict',
        lifecycle: 'opened',
        conflict_uid: 'conflict_old1',
        conflict_type: 'update_held_back',
        held_back: { show_fields: { changed_fields: ['name'], old: { name: 'A' }, new: { name: 'B' } }, show_creators: [], show_platforms: [], proposed_status_transition: null },
      },
    } as any);

    const newHeldBack = {
      showFields: { changedFields: ['name'], old: { name: 'A' }, new: { name: 'C' } },
      showCreators: [],
      showPlatforms: [],
      proposedStatusTransition: null,
    };

    const result = await service.reconcileShowConflict({ ...baseParams, heldBack: newHeldBack });

    expect(result.recorded).toBe(true);
    expect(auditService.create).toHaveBeenCalledTimes(2);
    expect(auditService.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      metadata: expect.objectContaining({ lifecycle: 'resolved', outcome: 'superseded', resolves_conflict_uid: 'conflict_old1' }),
    }));
    expect(auditService.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
      metadata: expect.objectContaining({ lifecycle: 'opened', conflict_type: 'update_held_back' }),
    }));
  });

  it('does not open a duplicate when the pending conflict has the identical diff', async () => {
    auditService.findLatestScheduleConflictForShow.mockResolvedValue({
      uid: 'aud_old',
      createdAt: new Date(),
      metadata: {
        event: 'schedule_publish_impact',
        impact_kind: 'stale_conflict',
        lifecycle: 'opened',
        conflict_uid: 'conflict_old1',
        conflict_type: 'update_held_back',
        held_back: { show_fields: { changed_fields: ['name'], old: { name: 'A' }, new: { name: 'B' } }, show_creators: [], show_platforms: [], proposed_status_transition: null },
      },
    } as any);

    const sameHeldBack = {
      showFields: { changedFields: ['name'], old: { name: 'A' }, new: { name: 'B' } },
      showCreators: [],
      showPlatforms: [],
      proposedStatusTransition: null,
    };

    const result = await service.reconcileShowConflict({ ...baseParams, heldBack: sameHeldBack });

    expect(result.recorded).toBe(false);
    expect(auditService.create).not.toHaveBeenCalled();
  });

  it('resolves FK-backed changed fields to uid+name at write time, never a raw id', async () => {
    mockTx.showType.findMany.mockResolvedValue([
      { id: BigInt(1), uid: 'shwtyp_1', name: 'bau' },
      { id: BigInt(2), uid: 'shwtyp_2', name: 'campaign' },
    ]);

    const heldBack = {
      showFields: {
        changedFields: ['show_type_id'],
        old: { show_type_id: BigInt(1) },
        new: { show_type_id: BigInt(2) },
      },
      showCreators: [],
      showPlatforms: [],
      proposedStatusTransition: null,
    };

    await service.reconcileShowConflict({ ...baseParams, heldBack: heldBack as any });

    const call = auditService.create.mock.calls[0][0] as any;
    expect(call.metadata.held_back.show_fields.old.show_type_id).toEqual({ uid: 'shwtyp_1', name: 'bau' });
    expect(call.metadata.held_back.show_fields.new.show_type_id).toEqual({ uid: 'shwtyp_2', name: 'campaign' });
  });

  describe('dismissConflict / applyConflict', () => {
    const pendingAudit = (overrides: Partial<any> = {}) => ({
      uid: 'aud_old',
      createdAt: new Date(),
      metadata: {
        event: 'schedule_publish_impact',
        impact_kind: 'stale_conflict',
        lifecycle: 'opened',
        conflict_uid: 'conflict_1',
        conflict_type: 'update_held_back',
        schedule_uid: 'schedule_1',
        external_id: 'EXT-1',
        held_back: { show_fields: { changed_fields: ['name'], old: { name: 'A' }, new: { name: 'B' } }, show_creators: [], show_platforms: [], proposed_status_transition: null },
        source: 'google_sheets_schedule_publish',
        ...overrides,
      },
    });

    it('dismiss always writes resolved/dismissed without touching show data', async () => {
      auditService.findLatestScheduleConflictForShow.mockResolvedValue(pendingAudit() as any);

      const result = await service.dismissConflict({ showId: BigInt(1), conflictUid: 'conflict_1', actorId: BigInt(9), reason: 'no longer needed' });

      expect(result.outcome).toBe('dismissed');
      expect(auditService.create).toHaveBeenCalledWith(expect.objectContaining({
        actorId: BigInt(9),
        reason: 'no longer needed',
        metadata: expect.objectContaining({ lifecycle: 'resolved', outcome: 'dismissed', resolves_conflict_uid: 'conflict_1' }),
      }));
    });

    it('dismiss throws CONFLICT_ALREADY_RESOLVED for an unknown or already-resolved conflict_uid', async () => {
      auditService.findLatestScheduleConflictForShow.mockResolvedValue(null);
      await expect(service.dismissConflict({ showId: BigInt(1), conflictUid: 'conflict_1', actorId: BigInt(9), reason: 'x' }))
        .rejects
        .toThrow('CONFLICT_ALREADY_RESOLVED');
    });

    it('apply writes the snapshot new values and resolved/applied when current DB state matches the snapshot old values', async () => {
      auditService.findLatestScheduleConflictForShow.mockResolvedValue(pendingAudit() as any);

      const result = await service.applyConflict({
        showId: BigInt(1),
        conflictUid: 'conflict_1',
        actorId: BigInt(9),
        reason: 'planner override',
        currentShowStatus: 'DRAFT',
        currentFieldValues: { name: 'A' },
      });

      expect(result.outcome).toBe('applied');
      expect(auditService.create).toHaveBeenCalledWith(expect.objectContaining({
        metadata: expect.objectContaining({ lifecycle: 'resolved', outcome: 'applied' }),
      }));
    });

    it('apply rejects with CONFLICT_STATE_CHANGED when current DB state has drifted from the snapshot', async () => {
      auditService.findLatestScheduleConflictForShow.mockResolvedValue(pendingAudit() as any);

      await expect(service.applyConflict({
        showId: BigInt(1),
        conflictUid: 'conflict_1',
        actorId: BigInt(9),
        reason: 'x',
        currentShowStatus: 'DRAFT',
        currentFieldValues: { name: 'SOMETHING ELSE' },
      })).rejects.toThrow('CONFLICT_STATE_CHANGED');
    });

    it('apply throws CONFLICT_ALREADY_RESOLVED when the conflict_uid no longer matches the pending one (double-resolve)', async () => {
      auditService.findLatestScheduleConflictForShow.mockResolvedValue(pendingAudit({ conflict_uid: 'conflict_DIFFERENT' }) as any);

      await expect(service.applyConflict({
        showId: BigInt(1),
        conflictUid: 'conflict_1',
        actorId: BigInt(9),
        reason: 'x',
        currentShowStatus: 'DRAFT',
        currentFieldValues: { name: 'A' },
      })).rejects.toThrow('CONFLICT_ALREADY_RESOLVED');
    });

    /**
     * Regression coverage for the schedule-publish rollback bug: applyConflict
     * used to write the auto-resolve audit row AND throw SHOW_NO_LONGER_ELIGIBLE
     * in the same call, which — when invoked from within the caller's own
     * @Transactional() ambient transaction (the real-world call shape, via
     * StudioShowManagementService.resolveScheduleConflict) — meant Prisma
     * rolled back the whole transaction on the throw, silently discarding the
     * write. The fix splits this into two independently-committing calls:
     * checkEligibility (writes + returns normally) and applyConflict (only
     * throws, never writes, for the ineligible case). applyConflict must
     * never again perform a write in its ineligible branch.
     */
    it('apply (phase 2) throws SHOW_NO_LONGER_ELIGIBLE WITHOUT writing when the show has left scope — eligibility + its write belong to checkEligibility, not here', async () => {
      auditService.findLatestScheduleConflictForShow.mockResolvedValue(pendingAudit() as any);

      await expect(service.applyConflict({
        showId: BigInt(1),
        conflictUid: 'conflict_1',
        actorId: BigInt(9),
        reason: 'x',
        currentShowStatus: 'COMPLETED',
        currentFieldValues: { name: 'A' },
      })).rejects.toThrow('SHOW_NO_LONGER_ELIGIBLE');

      expect(auditService.create).not.toHaveBeenCalled();
    });
  });

  describe('checkEligibility', () => {
    const pendingAudit = (overrides: Partial<any> = {}) => ({
      uid: 'aud_old',
      createdAt: new Date(),
      metadata: {
        event: 'schedule_publish_impact',
        impact_kind: 'stale_conflict',
        lifecycle: 'opened',
        conflict_uid: 'conflict_1',
        conflict_type: 'update_held_back',
        schedule_uid: 'schedule_1',
        external_id: 'EXT-1',
        held_back: { show_fields: { changed_fields: ['name'], old: { name: 'A' }, new: { name: 'B' } }, show_creators: [], show_platforms: [], proposed_status_transition: null },
        source: 'google_sheets_schedule_publish',
        ...overrides,
      },
    });

    it('resolves { eligible: true } and writes nothing when the show is still eligible', async () => {
      auditService.findLatestScheduleConflictForShow.mockResolvedValue(pendingAudit() as any);

      const result = await service.checkEligibility({ showId: BigInt(1), conflictUid: 'conflict_1', currentShowStatus: 'DRAFT' });

      expect(result).toEqual({ eligible: true });
      expect(auditService.create).not.toHaveBeenCalled();
    });

    /**
     * This is the core fix: unlike the old combined applyConflict, this
     * ineligible branch RETURNS NORMALLY (never throws) after writing the
     * auto-resolve row — so when checkEligibility is invoked directly (not
     * nested inside another @Transactional() call), its own transaction
     * commits the write, regardless of what the caller does afterward.
     */
    it('writes the auto-resolve row and resolves { eligible: false } (does not throw) when the show has left scope', async () => {
      auditService.findLatestScheduleConflictForShow.mockResolvedValue(pendingAudit() as any);

      const result = await service.checkEligibility({ showId: BigInt(1), conflictUid: 'conflict_1', currentShowStatus: 'COMPLETED' });

      expect(result).toEqual({ eligible: false });
      expect(auditService.create).toHaveBeenCalledWith(expect.objectContaining({
        metadata: expect.objectContaining({ lifecycle: 'resolved', outcome: 'auto_resolved_no_longer_conflicting', resolves_conflict_uid: 'conflict_1' }),
        actorId: null,
        reason: null,
      }));
    });

    it('throws CONFLICT_ALREADY_RESOLVED when the conflict_uid no longer matches the pending one', async () => {
      auditService.findLatestScheduleConflictForShow.mockResolvedValue(pendingAudit({ conflict_uid: 'conflict_DIFFERENT' }) as any);

      await expect(service.checkEligibility({ showId: BigInt(1), conflictUid: 'conflict_1', currentShowStatus: 'DRAFT' }))
        .rejects
        .toThrow('CONFLICT_ALREADY_RESOLVED');
    });
  });
});
