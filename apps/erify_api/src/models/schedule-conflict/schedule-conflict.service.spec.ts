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
});
