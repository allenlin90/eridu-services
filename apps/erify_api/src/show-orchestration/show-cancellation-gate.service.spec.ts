import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { ShowCancellationGateService } from './show-cancellation-gate.service';

import { AuditService } from '@/models/audit/audit.service';
import { StudioShiftService } from '@/models/studio-shift/studio-shift.service';

describe('showCancellationGateService', () => {
  let service: ShowCancellationGateService;
  const studioShiftServiceMock = { findActiveDutyManager: jest.fn() };
  const auditServiceMock = { findForTargets: jest.fn(), create: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShowCancellationGateService,
        { provide: StudioShiftService, useValue: studioShiftServiceMock },
        { provide: AuditService, useValue: auditServiceMock },
      ],
    }).compile();
    service = module.get(ShowCancellationGateService);
  });

  describe('resolveActorTier', () => {
    it('returns manager for ADMIN role without checking duty-manager shift', async () => {
      const tier = await service.resolveActorTier('studio_1', 'admin', { id: 5n });
      expect(tier).toBe('manager');
      expect(studioShiftServiceMock.findActiveDutyManager).not.toHaveBeenCalled();
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

  describe('getCancellationStatus', () => {
    it('returns not-pending when the show status is not CANCELLED_PENDING_RESOLUTION', async () => {
      const result = await service.getCancellationStatus({ id: 1n, showStatus: { systemKey: 'CONFIRMED' } });
      expect(result.isPending).toBe(false);
      expect(auditServiceMock.findForTargets).not.toHaveBeenCalled();
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
  });
});
