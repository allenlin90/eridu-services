import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { Show } from '@prisma/client';

import { GateNotificationService } from './gate-notification.service';
import { ShowCancellationGateService } from './show-cancellation-gate.service';

import { AuditService } from '@/models/audit/audit.service';
import { ShowRepository } from '@/models/show/show.repository';
import { ShowStatusService } from '@/models/show-status/show-status.service';
import { StudioShiftService } from '@/models/studio-shift/studio-shift.service';
import { TaskTargetService } from '@/models/task-target/task-target.service';

describe('showCancellationGateService', () => {
  let service: ShowCancellationGateService;
  const studioShiftServiceMock = { findActiveDutyManager: jest.fn() };
  const auditServiceMock = { findForTargets: jest.fn(), create: jest.fn() };
  const showRepositoryMock = { updateStatusIfPending: jest.fn() };
  const showStatusServiceMock = { getShowStatusBySystemKey: jest.fn() };
  const taskTargetServiceMock = { countActiveByShowId: jest.fn() };
  const gateNotificationServiceMock = { notifyGateOpened: jest.fn(), notifyGateResolved: jest.fn() };

  const actor = { id: 5n, uid: 'user_abc123', name: 'Jane Duty' };
  const show = { id: 1n, uid: 'show_xyz' } as Show;
  const statusByKey: Record<string, { id: bigint }> = {
    CONFIRMED: { id: 2n },
    LIVE: { id: 3n },
    CANCELLED_PENDING_RESOLUTION: { id: 6n },
    CANCELLED: { id: 5n },
    COMPLETED: { id: 4n },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShowCancellationGateService,
        { provide: StudioShiftService, useValue: studioShiftServiceMock },
        { provide: AuditService, useValue: auditServiceMock },
        { provide: ShowRepository, useValue: showRepositoryMock },
        { provide: ShowStatusService, useValue: showStatusServiceMock },
        { provide: TaskTargetService, useValue: taskTargetServiceMock },
        { provide: GateNotificationService, useValue: gateNotificationServiceMock },
      ],
    }).compile();
    service = module.get(ShowCancellationGateService);

    showStatusServiceMock.getShowStatusBySystemKey.mockImplementation(
      async (key: string) => statusByKey[key] ?? null,
    );
  });

  describe('resolveActorTier', () => {
    it('returns manager for ADMIN role when the actor is not the active duty manager', async () => {
      const tier = await service.resolveActorTier('studio_1', 'admin', { id: 5n });
      expect(tier).toBe('manager');
    });

    it('returns manager for MANAGER role', async () => {
      const tier = await service.resolveActorTier('studio_1', 'manager', { id: 5n });
      expect(tier).toBe('manager');
    });

    it('returns duty_manager when the actor is the active duty manager and holds no manager role', async () => {
      studioShiftServiceMock.findActiveDutyManager.mockResolvedValue({ user: { id: 5n } });
      const tier = await service.resolveActorTier('studio_1', 'member', { id: 5n });
      expect(tier).toBe('duty_manager');
    });

    it('returns duty_manager when the actor is the active duty manager even though they also hold a static ADMIN/MANAGER role', async () => {
      studioShiftServiceMock.findActiveDutyManager.mockResolvedValue({ user: { id: 5n } });
      const tier = await service.resolveActorTier('studio_1', 'manager', { id: 5n });
      expect(tier).toBe('duty_manager');
    });

    it('returns null when the actor is neither a manager nor the active duty manager', async () => {
      studioShiftServiceMock.findActiveDutyManager.mockResolvedValue(null);
      const tier = await service.resolveActorTier('studio_1', 'member', { id: 5n });
      expect(tier).toBeNull();
    });

    it('returns null when a different user is the active duty manager', async () => {
      studioShiftServiceMock.findActiveDutyManager.mockResolvedValue({ user: { id: 99n } });
      const tier = await service.resolveActorTier('studio_1', 'member', { id: 5n });
      expect(tier).toBeNull();
    });
  });

  describe('isActiveDutyManager', () => {
    it('returns true when the actor is the active duty manager, regardless of static role', async () => {
      studioShiftServiceMock.findActiveDutyManager.mockResolvedValue({ user: { id: 5n } });

      await expect(service.isActiveDutyManager('studio_1', { id: 5n })).resolves.toBe(true);
    });

    it('returns false when there is no active duty manager shift for the actor', async () => {
      studioShiftServiceMock.findActiveDutyManager.mockResolvedValue({ user: { id: 99n } });

      await expect(service.isActiveDutyManager('studio_1', { id: 5n })).resolves.toBe(false);
    });
  });

  describe('getCancellationStatus', () => {
    it('returns not-pending with empty history when no gate audits exist', async () => {
      auditServiceMock.findForTargets.mockResolvedValue([]);

      const result = await service.getCancellationStatus({ id: 1n, showStatus: { systemKey: 'CONFIRMED' } });

      expect(result.isPending).toBe(false);
      expect(result.history).toEqual([]);
      expect(auditServiceMock.findForTargets).toHaveBeenCalledWith([{ targetType: 'SHOW', targetId: 1n }]);
    });

    it('returns history after the show has left pending status', async () => {
      auditServiceMock.findForTargets.mockResolvedValue([
        {
          action: 'OVERRIDE',
          reason: 'Manager confirmed no production happened',
          actorId: 6n,
          createdAt: new Date('2026-06-25T17:00:00.000Z'),
          metadata: {
            field: 'show_status',
            event: 'resolved',
            gate_kind: 'show_cancellation',
            old_value: 'CANCELLED_PENDING_RESOLUTION',
            new_value: 'CANCELLED',
            actor_uid: 'user_manager',
            actor_name: 'Jane Manager',
          },
        },
        {
          action: 'OVERRIDE',
          reason: 'Camera failed mid-show',
          actorId: 5n,
          createdAt: new Date('2026-06-25T16:14:30.201Z'),
          metadata: {
            field: 'show_status',
            event: 'opened',
            gate_kind: 'show_cancellation',
            old_value: 'CONFIRMED',
            new_value: 'CANCELLED_PENDING_RESOLUTION',
            reason_category: 'EQUIPMENT_FAILURE',
            actor_uid: 'user_duty',
            actor_name: 'Bob Duty',
          },
        },
      ]);

      const result = await service.getCancellationStatus({ id: 1n, showStatus: { systemKey: 'CANCELLED' } });

      expect(result).toMatchObject({
        isPending: false,
        gateKind: null,
        fromStatus: null,
        reasonCategory: null,
        reasonNote: null,
        openedBy: null,
        openedAt: null,
        allowedOutcomes: [],
      });
      expect(result.history).toEqual([
        expect.objectContaining({ event: 'opened', note: 'Camera failed mid-show', outcome: null }),
        expect.objectContaining({ event: 'resolved', note: 'Manager confirmed no production happened', outcome: 'CANCELLED' }),
      ]);
    });

    it('derives the snapshot from the most recent opened audit row', async () => {
      auditServiceMock.findForTargets.mockResolvedValue([
        {
          action: 'OVERRIDE',
          reason: 'Camera failed mid-show',
          actorId: 5n,
          createdAt: new Date('2026-06-25T16:14:30.201Z'),
          metadata: {
            field: 'show_status',
            event: 'opened',
            gate_kind: 'show_cancellation',
            old_value: 'CONFIRMED',
            new_value: 'CANCELLED_PENDING_RESOLUTION',
            reason_category: 'EQUIPMENT_FAILURE',
            actor_uid: 'user_abc123',
            actor_name: 'Jane Duty',
          },
        },
      ]);

      const result = await service.getCancellationStatus({
        id: 1n,
        showStatus: { systemKey: 'CANCELLED_PENDING_RESOLUTION' },
      });

      expect(result).toEqual({
        isPending: true,
        gateKind: 'show_cancellation',
        fromStatus: 'CONFIRMED',
        reasonCategory: 'EQUIPMENT_FAILURE',
        reasonNote: 'Camera failed mid-show',
        openedBy: { uid: 'user_abc123', name: 'Jane Duty' },
        openedAt: new Date('2026-06-25T16:14:30.201Z'),
        allowedOutcomes: ['CANCELLED', 'COMPLETED'],
        history: [
          {
            event: 'opened',
            actor: { uid: 'user_abc123', name: 'Jane Duty' },
            at: new Date('2026-06-25T16:14:30.201Z'),
            note: 'Camera failed mid-show',
            outcome: null,
          },
        ],
      });
    });

    it('uses the latest note_updated row for reasonNote but the original opened row for category/fromStatus/openedBy', async () => {
      auditServiceMock.findForTargets.mockResolvedValue([
        {
          action: 'OVERRIDE',
          reason: 'Actually two cameras failed',
          actorId: 6n,
          createdAt: new Date('2026-06-25T17:00:00.000Z'),
          metadata: {
            field: 'show_status',
            event: 'note_updated',
            gate_kind: 'show_cancellation',
            old_value: null,
            new_value: null,
            actor_uid: 'user_def456',
            actor_name: 'Bob Duty',
          },
        },
        {
          action: 'OVERRIDE',
          reason: 'Camera failed mid-show',
          actorId: 5n,
          createdAt: new Date('2026-06-25T16:14:30.201Z'),
          metadata: {
            field: 'show_status',
            event: 'opened',
            gate_kind: 'show_cancellation',
            old_value: 'CONFIRMED',
            new_value: 'CANCELLED_PENDING_RESOLUTION',
            reason_category: 'EQUIPMENT_FAILURE',
            actor_uid: 'user_abc123',
            actor_name: 'Jane Duty',
          },
        },
      ]);

      const result = await service.getCancellationStatus({
        id: 1n,
        showStatus: { systemKey: 'CANCELLED_PENDING_RESOLUTION' },
      });

      expect(result.reasonNote).toBe('Actually two cameras failed');
      expect(result.reasonCategory).toBe('EQUIPMENT_FAILURE');
      expect(result.fromStatus).toBe('CONFIRMED');
      expect(result.openedBy).toEqual({ uid: 'user_abc123', name: 'Jane Duty' });
      expect(result.history).toHaveLength(2);
      expect(result.history[0].event).toBe('opened');
      expect(result.history[1].event).toBe('note_updated');
    });

    it('returns openedBy: null and history actor: null for a system-opened (no actor_uid) audit row', async () => {
      auditServiceMock.findForTargets.mockResolvedValue([
        {
          action: 'OVERRIDE',
          reason: 'Removed from republished schedule; 2 active task(s) still attached',
          actorId: null,
          createdAt: new Date('2026-06-25T16:14:30.201Z'),
          metadata: {
            field: 'show_status',
            event: 'opened',
            gate_kind: 'schedule_publish_removal',
            old_value: 'CONFIRMED',
            new_value: 'CANCELLED_PENDING_RESOLUTION',
            reason_category: 'REMOVED_FROM_REPUBLISHED_SCHEDULE',
          },
        },
      ]);

      const result = await service.getCancellationStatus({
        id: 1n,
        showStatus: { systemKey: 'CANCELLED_PENDING_RESOLUTION' },
      });

      expect(result.openedBy).toBeNull();
      expect(result.history[0].actor).toBeNull();
    });
  });

  describe('openPending', () => {
    it('rejects a reason category not in the gate config', async () => {
      await expect(
        service.openPending({
          show,
          gateKind: 'show_cancellation',
          fromStatusSystemKey: 'CONFIRMED',
          reasonCategory: 'NOT_A_REAL_CATEGORY',
          reasonNote: 'note',
          actor,
        }),
      ).rejects.toThrow(/REASON_CATEGORY_NOT_ALLOWED/);
      expect(showRepositoryMock.updateStatusIfPending).not.toHaveBeenCalled();
    });

    it('writes an opened audit row and moves the show to pending', async () => {
      showRepositoryMock.updateStatusIfPending.mockResolvedValue(true);

      await service.openPending({
        show,
        gateKind: 'show_cancellation',
        fromStatusSystemKey: 'CONFIRMED',
        reasonCategory: 'EQUIPMENT_FAILURE',
        reasonNote: 'Camera failed mid-show',
        actor,
      });

      expect(showRepositoryMock.updateStatusIfPending).toHaveBeenCalledWith(1n, 2n, 6n);
      expect(auditServiceMock.create).toHaveBeenCalledWith({
        action: 'OVERRIDE',
        actorId: 5n,
        reason: 'Camera failed mid-show',
        metadata: {
          field: 'show_status',
          event: 'opened',
          gate_kind: 'show_cancellation',
          old_value: 'CONFIRMED',
          new_value: 'CANCELLED_PENDING_RESOLUTION',
          reason_category: 'EQUIPMENT_FAILURE',
          actor_uid: 'user_abc123',
          actor_name: 'Jane Duty',
        },
        targets: [{ targetType: 'SHOW', targetId: 1n }],
      });
      expect(gateNotificationServiceMock.notifyGateOpened).toHaveBeenCalledWith(
        show,
        'show_cancellation',
        { category: 'EQUIPMENT_FAILURE', note: 'Camera failed mid-show' },
        actor,
      );
    });

    it('throws SHOW_STATUS_CHANGED when the guarded write matches no rows', async () => {
      showRepositoryMock.updateStatusIfPending.mockResolvedValue(false);

      await expect(
        service.openPending({
          show,
          gateKind: 'show_cancellation',
          fromStatusSystemKey: 'CONFIRMED',
          reasonCategory: 'EQUIPMENT_FAILURE',
          reasonNote: 'note',
          actor,
        }),
      ).rejects.toThrow(/SHOW_STATUS_CHANGED/);
      expect(auditServiceMock.create).not.toHaveBeenCalled();
    });

    it('writes a system-actor audit row (actorId null, no actor_uid/actor_name) when actor is null', async () => {
      showRepositoryMock.updateStatusIfPending.mockResolvedValue(true);

      await service.openPending({
        show,
        gateKind: 'schedule_publish_removal',
        fromStatusSystemKey: 'CONFIRMED',
        reasonCategory: 'REMOVED_FROM_REPUBLISHED_SCHEDULE',
        reasonNote: 'Removed from republished schedule; 2 active task(s) still attached',
        actor: null,
      });

      expect(auditServiceMock.create).toHaveBeenCalledWith({
        action: 'OVERRIDE',
        actorId: null,
        reason: 'Removed from republished schedule; 2 active task(s) still attached',
        metadata: {
          field: 'show_status',
          event: 'opened',
          gate_kind: 'schedule_publish_removal',
          old_value: 'CONFIRMED',
          new_value: 'CANCELLED_PENDING_RESOLUTION',
          reason_category: 'REMOVED_FROM_REPUBLISHED_SCHEDULE',
        },
        targets: [{ targetType: 'SHOW', targetId: 1n }],
      });
      expect(gateNotificationServiceMock.notifyGateOpened).toHaveBeenCalledWith(
        show,
        'schedule_publish_removal',
        { category: 'REMOVED_FROM_REPUBLISHED_SCHEDULE', note: 'Removed from republished schedule; 2 active task(s) still attached' },
        null,
      );
    });
  });

  describe('resolveAtomic', () => {
    it('rejects a reason category not in the gate config, before checking outcome or active tasks', async () => {
      await expect(
        service.resolveAtomic({
          show,
          gateKind: 'show_cancellation',
          fromStatusSystemKey: 'CONFIRMED',
          outcome: 'CANCELLED',
          reasonCategory: 'NOT_A_REAL_CATEGORY',
          reasonNote: 'note',
          actor,
        }),
      ).rejects.toThrow(/REASON_CATEGORY_NOT_ALLOWED/);
      expect(taskTargetServiceMock.countActiveByShowId).not.toHaveBeenCalled();
      expect(showRepositoryMock.updateStatusIfPending).not.toHaveBeenCalled();
    });

    it('allows CANCELLED from LIVE when no active tasks remain — same rule as any other from_status', async () => {
      taskTargetServiceMock.countActiveByShowId.mockResolvedValue(0);
      showRepositoryMock.updateStatusIfPending.mockResolvedValue(true);

      await service.resolveAtomic({
        show,
        gateKind: 'show_cancellation',
        fromStatusSystemKey: 'LIVE',
        outcome: 'CANCELLED',
        reasonCategory: 'CLIENT_REQUEST',
        reasonNote: 'note',
        actor,
      });

      expect(showRepositoryMock.updateStatusIfPending).toHaveBeenCalledWith(1n, 3n, 5n);
    });

    it('rejects CANCELLED when active tasks remain, with the count in details', async () => {
      taskTargetServiceMock.countActiveByShowId.mockResolvedValue(3);

      await expect(
        service.resolveAtomic({
          show,
          gateKind: 'show_cancellation',
          fromStatusSystemKey: 'CONFIRMED',
          outcome: 'CANCELLED',
          reasonCategory: 'EQUIPMENT_FAILURE',
          reasonNote: 'note',
          actor,
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          message: 'ACTIVE_TASKS_REMAIN',
          details: { activeTaskCount: 3 },
        }),
      });
    });

    it('does not check active tasks for COMPLETED (not in outcomesRequiringNoActiveTasks)', async () => {
      showRepositoryMock.updateStatusIfPending.mockResolvedValue(true);

      await service.resolveAtomic({
        show,
        gateKind: 'show_cancellation',
        fromStatusSystemKey: 'CONFIRMED',
        outcome: 'COMPLETED',
        reasonCategory: 'EQUIPMENT_FAILURE',
        reasonNote: 'Ran most of the show',
        actor,
      });

      expect(taskTargetServiceMock.countActiveByShowId).not.toHaveBeenCalled();
    });

    it('moves the show directly to the outcome and writes one resolved audit row', async () => {
      taskTargetServiceMock.countActiveByShowId.mockResolvedValue(0);
      showRepositoryMock.updateStatusIfPending.mockResolvedValue(true);

      await service.resolveAtomic({
        show,
        gateKind: 'show_cancellation',
        fromStatusSystemKey: 'CONFIRMED',
        outcome: 'CANCELLED',
        reasonCategory: 'EQUIPMENT_FAILURE',
        reasonNote: 'Camera failed mid-show',
        actor,
      });

      expect(showRepositoryMock.updateStatusIfPending).toHaveBeenCalledWith(1n, 2n, 5n);
      expect(auditServiceMock.create).toHaveBeenCalledTimes(1);
      expect(auditServiceMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ event: 'resolved', old_value: 'CONFIRMED', new_value: 'CANCELLED' }),
        }),
      );
      expect(gateNotificationServiceMock.notifyGateResolved).toHaveBeenCalledWith(show, 'show_cancellation', 'CANCELLED', actor);
    });
  });

  describe('amendPendingNote', () => {
    it('writes a note_updated audit row without old/new values', async () => {
      await service.amendPendingNote({
        showId: 1n,
        gateKind: 'show_cancellation',
        reasonNote: 'Actually two cameras failed',
        actor,
      });

      expect(auditServiceMock.create).toHaveBeenCalledWith({
        action: 'OVERRIDE',
        actorId: 5n,
        reason: 'Actually two cameras failed',
        metadata: {
          field: 'show_status',
          event: 'note_updated',
          gate_kind: 'show_cancellation',
          old_value: null,
          new_value: null,
          actor_uid: 'user_abc123',
          actor_name: 'Jane Duty',
        },
        targets: [{ targetType: 'SHOW', targetId: 1n }],
      });
    });
  });

  describe('resolvePending', () => {
    it('rejects an outcome not allowed for the gate kind', async () => {
      await expect(
        service.resolvePending({
          show,
          gateKind: 'show_cancellation',
          fromStatusSystemKey: 'CONFIRMED',
          outcome: 'RESTORE_PREVIOUS',
          resolutionNotes: 'note',
          actor,
        }),
      ).rejects.toThrow(/OUTCOME_NOT_ALLOWED/);
    });

    it('resolves RESTORE_PREVIOUS by reverting to the captured from_status', async () => {
      showRepositoryMock.updateStatusIfPending.mockResolvedValue(true);

      await service.resolvePending({
        show,
        gateKind: 'schedule_publish_removal',
        fromStatusSystemKey: 'CONFIRMED',
        outcome: 'RESTORE_PREVIOUS',
        resolutionNotes: 'Schedule sync error, resuming.',
        actor,
      });

      expect(showRepositoryMock.updateStatusIfPending).toHaveBeenCalledWith(1n, 6n, 2n);
      expect(auditServiceMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ event: 'resolved', old_value: 'CANCELLED_PENDING_RESOLUTION', new_value: 'CONFIRMED' }),
        }),
      );
    });

    it('throws SHOW_ALREADY_RESOLVED when the guarded write matches no rows', async () => {
      showRepositoryMock.updateStatusIfPending.mockResolvedValue(false);

      await expect(
        service.resolvePending({
          show,
          gateKind: 'show_cancellation',
          fromStatusSystemKey: 'CONFIRMED',
          outcome: 'CANCELLED',
          resolutionNotes: 'note',
          actor,
        }),
      ).rejects.toThrow(/SHOW_ALREADY_RESOLVED/);
    });
  });
});
