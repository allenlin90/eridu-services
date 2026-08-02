import { ShowIssueReconciliationService } from './show-issue-reconciliation.service';
import { normalizeViolationSeverity } from './show-issue-severity-normalization';

import type { AuditService } from '@/models/audit/audit.service';
import type { ShowIssueWithRelations } from '@/models/show-issue/schemas/show-issue.schema';
import type { ShowIssueService } from '@/models/show-issue/show-issue.service';

function buildIssue(overrides: Partial<ShowIssueWithRelations> = {}): ShowIssueWithRelations {
  return {
    id: 1n,
    uid: 'issue_test123',
    showId: 10n,
    category: 'CREATOR_ATTENDANCE',
    origin: 'FACT_EXTRACTION',
    severity: 'HIGH',
    status: 'OPEN',
    title: 'Creator attendance missing',
    evidence: 'Sick leave.',
    ownerId: null,
    dueAt: null,
    createdById: null,
    escalationLevel: 0,
    escalatedAt: null,
    escalatedById: null,
    escalationNote: null,
    resolvedAt: null,
    resolvedById: null,
    resolutionCode: null,
    resolutionNote: null,
    showCreatorId: 101n,
    showPlatformViolationId: null,
    version: 1,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    show: { uid: 'show_1' },
    owner: null,
    createdBy: null,
    escalatedBy: null,
    resolvedBy: null,
    showCreator: { uid: 'show_mc_alpha' },
    showPlatformViolation: null,
    ...overrides,
  } as ShowIssueWithRelations;
}

function buildShowIssueService(): jest.Mocked<
  Pick<
    ShowIssueService,
    | 'findActiveAutomatedIssueByShowCreator'
    | 'findActiveAutomatedIssueByShowPlatformViolation'
    | 'createShowIssue'
    | 'resolveShowIssue'
    | 'reopenShowIssue'
    | 'updateShowIssueFields'
  >
> {
  return {
    findActiveAutomatedIssueByShowCreator: jest.fn().mockResolvedValue(null),
    findActiveAutomatedIssueByShowPlatformViolation: jest.fn().mockResolvedValue(null),
    createShowIssue: jest.fn(),
    resolveShowIssue: jest.fn(),
    reopenShowIssue: jest.fn(),
    updateShowIssueFields: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<
      ShowIssueService,
      | 'findActiveAutomatedIssueByShowCreator'
      | 'findActiveAutomatedIssueByShowPlatformViolation'
      | 'createShowIssue'
      | 'resolveShowIssue'
      | 'reopenShowIssue'
      | 'updateShowIssueFields'
    >
  >;
}

function buildAuditService(): jest.Mocked<Pick<AuditService, 'create'>> {
  return {
    create: jest.fn().mockResolvedValue({ uid: 'aud_1' } as never),
  } as unknown as jest.Mocked<Pick<AuditService, 'create'>>;
}

const showId = 10n;

describe('showIssueReconciliationService', () => {
  describe('attendance_missing', () => {
    it('creates a new CREATOR_ATTENDANCE issue when none exists', async () => {
      const showIssueService = buildShowIssueService();
      const auditService = buildAuditService();
      const created = buildIssue({ id: 55n });
      showIssueService.createShowIssue.mockResolvedValue(created);
      const service = new ShowIssueReconciliationService(
        showIssueService as unknown as ShowIssueService,
        auditService as unknown as AuditService,
      );

      await service.applySignals([{
        kind: 'attendance_missing',
        showCreatorId: 101n,
        showCreatorUid: 'show_mc_alpha',
        evidence: 'Sick leave.',
      }], showId);

      expect(showIssueService.createShowIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          showId,
          category: 'CREATOR_ATTENDANCE',
          origin: 'FACT_EXTRACTION',
          evidence: 'Sick leave.',
          showCreatorId: 101n,
        }),
      );
      expect(auditService.create).toHaveBeenCalledWith(expect.objectContaining({
        action: 'CREATE',
        actorId: null,
        targets: [{ targetType: 'SHOW_ISSUE', targetId: 55n }],
      }));
    });

    it('reopens and refreshes evidence when a source-resolved issue exists for the same identity', async () => {
      const showIssueService = buildShowIssueService();
      const auditService = buildAuditService();
      const resolved = buildIssue({
        status: 'RESOLVED',
        resolutionCode: 'SOURCE_CORRECTED',
        evidence: 'Old reason.',
        version: 3,
      });
      showIssueService.findActiveAutomatedIssueByShowCreator.mockResolvedValue(resolved);
      const reopened = buildIssue({ status: 'OPEN', evidence: 'Old reason.', version: 4 });
      showIssueService.reopenShowIssue.mockResolvedValue(reopened);
      const refreshed = buildIssue({ status: 'OPEN', evidence: 'New reason.', version: 5 });
      showIssueService.updateShowIssueFields.mockResolvedValue(refreshed);
      const service = new ShowIssueReconciliationService(
        showIssueService as unknown as ShowIssueService,
        auditService as unknown as AuditService,
      );

      await service.applySignals([{
        kind: 'attendance_missing',
        showCreatorId: 101n,
        showCreatorUid: 'show_mc_alpha',
        evidence: 'New reason.',
      }], showId);

      expect(showIssueService.reopenShowIssue).toHaveBeenCalledWith(resolved, 3);
      expect(showIssueService.updateShowIssueFields).toHaveBeenCalledWith(
        reopened,
        4,
        { evidence: 'New reason.' },
      );
      expect(auditService.create).toHaveBeenCalledTimes(2);
    });

    it('does not reopen an issue resolved with a non-SOURCE_CORRECTED code (manual closure)', async () => {
      const showIssueService = buildShowIssueService();
      const auditService = buildAuditService();
      const manuallyResolved = buildIssue({ status: 'RESOLVED', resolutionCode: 'FIXED' });
      showIssueService.findActiveAutomatedIssueByShowCreator.mockResolvedValue(manuallyResolved);
      const service = new ShowIssueReconciliationService(
        showIssueService as unknown as ShowIssueService,
        auditService as unknown as AuditService,
      );

      await service.applySignals([{
        kind: 'attendance_missing',
        showCreatorId: 101n,
        showCreatorUid: 'show_mc_alpha',
        evidence: 'New reason.',
      }], showId);

      expect(showIssueService.reopenShowIssue).not.toHaveBeenCalled();
      expect(showIssueService.updateShowIssueFields).not.toHaveBeenCalled();
      expect(showIssueService.createShowIssue).not.toHaveBeenCalled();
      expect(auditService.create).not.toHaveBeenCalled();
    });

    it('refreshes evidence only when it changed on an already-OPEN issue (no audit noise on replay)', async () => {
      const showIssueService = buildShowIssueService();
      const auditService = buildAuditService();
      const existing = buildIssue({ status: 'OPEN', evidence: 'Sick leave.', version: 2 });
      showIssueService.findActiveAutomatedIssueByShowCreator.mockResolvedValue(existing);
      const service = new ShowIssueReconciliationService(
        showIssueService as unknown as ShowIssueService,
        auditService as unknown as AuditService,
      );

      // Replay: identical evidence.
      await service.applySignals([{
        kind: 'attendance_missing',
        showCreatorId: 101n,
        showCreatorUid: 'show_mc_alpha',
        evidence: 'Sick leave.',
      }], showId);

      expect(showIssueService.updateShowIssueFields).not.toHaveBeenCalled();
      expect(auditService.create).not.toHaveBeenCalled();
    });

    it('writes an evidence-refresh audit when the reason drifted on an already-OPEN issue', async () => {
      const showIssueService = buildShowIssueService();
      const auditService = buildAuditService();
      const existing = buildIssue({ status: 'IN_PROGRESS', evidence: 'Old reason.', version: 2 });
      showIssueService.findActiveAutomatedIssueByShowCreator.mockResolvedValue(existing);
      const refreshed = buildIssue({ status: 'IN_PROGRESS', evidence: 'New reason.', version: 3 });
      showIssueService.updateShowIssueFields.mockResolvedValue(refreshed);
      const service = new ShowIssueReconciliationService(
        showIssueService as unknown as ShowIssueService,
        auditService as unknown as AuditService,
      );

      await service.applySignals([{
        kind: 'attendance_missing',
        showCreatorId: 101n,
        showCreatorUid: 'show_mc_alpha',
        evidence: 'New reason.',
      }], showId);

      expect(showIssueService.updateShowIssueFields).toHaveBeenCalledWith(existing, 2, { evidence: 'New reason.' });
      expect(auditService.create).toHaveBeenCalledTimes(1);
    });

    it('never touches a MANUAL issue occupying the identity (defensive; not structurally reachable)', async () => {
      const showIssueService = buildShowIssueService();
      const auditService = buildAuditService();
      const manualIssue = buildIssue({ origin: 'MANUAL', status: 'OPEN' });
      showIssueService.findActiveAutomatedIssueByShowCreator.mockResolvedValue(manualIssue);
      const service = new ShowIssueReconciliationService(
        showIssueService as unknown as ShowIssueService,
        auditService as unknown as AuditService,
      );

      await service.applySignals([{
        kind: 'attendance_missing',
        showCreatorId: 101n,
        showCreatorUid: 'show_mc_alpha',
        evidence: 'New reason.',
      }], showId);

      expect(showIssueService.createShowIssue).not.toHaveBeenCalled();
      expect(showIssueService.reopenShowIssue).not.toHaveBeenCalled();
      expect(showIssueService.updateShowIssueFields).not.toHaveBeenCalled();
      expect(showIssueService.resolveShowIssue).not.toHaveBeenCalled();
      expect(auditService.create).not.toHaveBeenCalled();
    });

    it('does not create a duplicate on a replayed signal that resolves to the same OPEN state', async () => {
      // Same scenario as the no-op evidence-refresh test, phrased as the
      // design doc's general replay-idempotency requirement.
      const showIssueService = buildShowIssueService();
      const auditService = buildAuditService();
      const existing = buildIssue({ status: 'OPEN', evidence: 'Sick leave.' });
      showIssueService.findActiveAutomatedIssueByShowCreator.mockResolvedValue(existing);
      const service = new ShowIssueReconciliationService(
        showIssueService as unknown as ShowIssueService,
        auditService as unknown as AuditService,
      );
      const signal = {
        kind: 'attendance_missing' as const,
        showCreatorId: 101n,
        showCreatorUid: 'show_mc_alpha',
        evidence: 'Sick leave.',
      };

      await service.applySignals([signal], showId);
      await service.applySignals([signal], showId);

      expect(showIssueService.createShowIssue).not.toHaveBeenCalled();
      expect(auditService.create).not.toHaveBeenCalled();
    });
  });

  describe('attendance_present', () => {
    it('resolves the linked automated issue with SOURCE_CORRECTED', async () => {
      const showIssueService = buildShowIssueService();
      const auditService = buildAuditService();
      const existing = buildIssue({ status: 'OPEN', version: 2 });
      showIssueService.findActiveAutomatedIssueByShowCreator.mockResolvedValue(existing);
      const resolved = buildIssue({ status: 'RESOLVED', resolutionCode: 'SOURCE_CORRECTED', version: 3 });
      showIssueService.resolveShowIssue.mockResolvedValue(resolved);
      const service = new ShowIssueReconciliationService(
        showIssueService as unknown as ShowIssueService,
        auditService as unknown as AuditService,
      );

      await service.applySignals([{
        kind: 'attendance_present',
        showCreatorId: 101n,
        showCreatorUid: 'show_mc_alpha',
      }], showId);

      expect(showIssueService.resolveShowIssue).toHaveBeenCalledWith(existing, 2, {
        resolvedById: null,
        resolutionCode: 'SOURCE_CORRECTED',
        resolutionNote: expect.any(String),
      });
      expect(auditService.create).toHaveBeenCalledWith(expect.objectContaining({
        action: 'UPDATE',
        actorId: null,
        targets: [{ targetType: 'SHOW_ISSUE', targetId: resolved.id }],
      }));
    });

    it('no-ops when no linked issue exists', async () => {
      const showIssueService = buildShowIssueService();
      const auditService = buildAuditService();
      const service = new ShowIssueReconciliationService(
        showIssueService as unknown as ShowIssueService,
        auditService as unknown as AuditService,
      );

      await service.applySignals([{
        kind: 'attendance_present',
        showCreatorId: 101n,
        showCreatorUid: 'show_mc_alpha',
      }], showId);

      expect(showIssueService.resolveShowIssue).not.toHaveBeenCalled();
      expect(auditService.create).not.toHaveBeenCalled();
    });

    it('no-ops (replay-idempotent) when already resolved with SOURCE_CORRECTED', async () => {
      const showIssueService = buildShowIssueService();
      const auditService = buildAuditService();
      const alreadyResolved = buildIssue({ status: 'RESOLVED', resolutionCode: 'SOURCE_CORRECTED' });
      showIssueService.findActiveAutomatedIssueByShowCreator.mockResolvedValue(alreadyResolved);
      const service = new ShowIssueReconciliationService(
        showIssueService as unknown as ShowIssueService,
        auditService as unknown as AuditService,
      );

      await service.applySignals([{
        kind: 'attendance_present',
        showCreatorId: 101n,
        showCreatorUid: 'show_mc_alpha',
      }], showId);

      expect(showIssueService.resolveShowIssue).not.toHaveBeenCalled();
      expect(auditService.create).not.toHaveBeenCalled();
    });
  });

  describe('platform_violation_opened', () => {
    it('creates one PLATFORM_VIOLATION issue keyed by the violation id, normalizing severity', async () => {
      const showIssueService = buildShowIssueService();
      const auditService = buildAuditService();
      const created = buildIssue({
        id: 77n,
        category: 'PLATFORM_VIOLATION',
        showCreatorId: null,
        showPlatformViolationId: 501n,
      });
      showIssueService.createShowIssue.mockResolvedValue(created);
      const service = new ShowIssueReconciliationService(
        showIssueService as unknown as ShowIssueService,
        auditService as unknown as AuditService,
      );

      await service.applySignals([{
        kind: 'platform_violation_opened',
        showPlatformViolationId: 501n,
        violationUid: 'spv_new',
        showPlatformId: 200n,
        severity: 'ERROR',
        reason: 'Copyright warning from platform',
      }], showId);

      expect(showIssueService.createShowIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          showId,
          category: 'PLATFORM_VIOLATION',
          origin: 'FACT_EXTRACTION',
          severity: 'HIGH',
          evidence: 'Copyright warning from platform',
          showPlatformViolationId: 501n,
        }),
      );
      expect(auditService.create).toHaveBeenCalledWith(expect.objectContaining({
        action: 'CREATE',
        actorId: null,
        targets: [{ targetType: 'SHOW_ISSUE', targetId: 77n }],
      }));
    });

    it('is replay-idempotent: no duplicate row and no audit when the identity already carries the same evidence', async () => {
      const showIssueService = buildShowIssueService();
      const auditService = buildAuditService();
      const existing = buildIssue({
        category: 'PLATFORM_VIOLATION',
        showCreatorId: null,
        showPlatformViolationId: 501n,
        evidence: 'Copyright warning from platform',
      });
      showIssueService.findActiveAutomatedIssueByShowPlatformViolation.mockResolvedValue(existing);
      const service = new ShowIssueReconciliationService(
        showIssueService as unknown as ShowIssueService,
        auditService as unknown as AuditService,
      );

      await service.applySignals([{
        kind: 'platform_violation_opened',
        showPlatformViolationId: 501n,
        violationUid: 'spv_new',
        showPlatformId: 200n,
        severity: 'ERROR',
        reason: 'Copyright warning from platform',
      }], showId);

      expect(showIssueService.createShowIssue).not.toHaveBeenCalled();
      expect(showIssueService.updateShowIssueFields).not.toHaveBeenCalled();
      expect(auditService.create).not.toHaveBeenCalled();
    });

    it('refreshes evidence on a retry that carries a different reason for the same violation id', async () => {
      const showIssueService = buildShowIssueService();
      const auditService = buildAuditService();
      const existing = buildIssue({
        category: 'PLATFORM_VIOLATION',
        showCreatorId: null,
        showPlatformViolationId: 501n,
        evidence: 'Old reason',
        version: 1,
      });
      showIssueService.findActiveAutomatedIssueByShowPlatformViolation.mockResolvedValue(existing);
      const refreshed = buildIssue({ evidence: 'New reason', version: 2 });
      showIssueService.updateShowIssueFields.mockResolvedValue(refreshed);
      const service = new ShowIssueReconciliationService(
        showIssueService as unknown as ShowIssueService,
        auditService as unknown as AuditService,
      );

      await service.applySignals([{
        kind: 'platform_violation_opened',
        showPlatformViolationId: 501n,
        violationUid: 'spv_new',
        showPlatformId: 200n,
        severity: 'ERROR',
        reason: 'New reason',
      }], showId);

      expect(showIssueService.updateShowIssueFields).toHaveBeenCalledWith(existing, 1, { evidence: 'New reason' });
      expect(auditService.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('platform_violation_superseded', () => {
    it('resolves the linked issue with SOURCE_CORRECTED', async () => {
      const showIssueService = buildShowIssueService();
      const auditService = buildAuditService();
      const existing = buildIssue({
        category: 'PLATFORM_VIOLATION',
        showCreatorId: null,
        showPlatformViolationId: 601n,
        status: 'OPEN',
        version: 1,
      });
      showIssueService.findActiveAutomatedIssueByShowPlatformViolation.mockResolvedValue(existing);
      const resolved = buildIssue({ status: 'RESOLVED', resolutionCode: 'SOURCE_CORRECTED', version: 2 });
      showIssueService.resolveShowIssue.mockResolvedValue(resolved);
      const service = new ShowIssueReconciliationService(
        showIssueService as unknown as ShowIssueService,
        auditService as unknown as AuditService,
      );

      await service.applySignals([{
        kind: 'platform_violation_superseded',
        showPlatformViolationId: 601n,
        violationUid: 'spv_old',
      }], showId);

      expect(showIssueService.resolveShowIssue).toHaveBeenCalledWith(existing, 1, {
        resolvedById: null,
        resolutionCode: 'SOURCE_CORRECTED',
        resolutionNote: expect.any(String),
      });
    });

    it('no-ops when no linked issue exists for the violation id', async () => {
      const showIssueService = buildShowIssueService();
      const auditService = buildAuditService();
      const service = new ShowIssueReconciliationService(
        showIssueService as unknown as ShowIssueService,
        auditService as unknown as AuditService,
      );

      await service.applySignals([{
        kind: 'platform_violation_superseded',
        showPlatformViolationId: 601n,
        violationUid: 'spv_old',
      }], showId);

      expect(showIssueService.resolveShowIssue).not.toHaveBeenCalled();
      expect(auditService.create).not.toHaveBeenCalled();
    });
  });

  describe('applySignals cap', () => {
    it('rejects a call with more signals than the cap before touching the DB', async () => {
      const showIssueService = buildShowIssueService();
      const auditService = buildAuditService();
      const service = new ShowIssueReconciliationService(
        showIssueService as unknown as ShowIssueService,
        auditService as unknown as AuditService,
      );
      const signals = Array.from({ length: 26 }, (_, i) => ({
        kind: 'platform_violation_superseded' as const,
        showPlatformViolationId: BigInt(i),
        violationUid: `spv_${i}`,
      }));

      await expect(service.applySignals(signals, showId)).rejects.toThrow(/26 signals/);

      expect(showIssueService.findActiveAutomatedIssueByShowPlatformViolation).not.toHaveBeenCalled();
      expect(showIssueService.resolveShowIssue).not.toHaveBeenCalled();
      expect(auditService.create).not.toHaveBeenCalled();
    });

    it('allows a call exactly at the cap', async () => {
      const showIssueService = buildShowIssueService();
      const auditService = buildAuditService();
      const service = new ShowIssueReconciliationService(
        showIssueService as unknown as ShowIssueService,
        auditService as unknown as AuditService,
      );
      const signals = Array.from({ length: 25 }, (_, i) => ({
        kind: 'platform_violation_superseded' as const,
        showPlatformViolationId: BigInt(i),
        violationUid: `spv_${i}`,
      }));

      await expect(service.applySignals(signals, showId)).resolves.toBeUndefined();

      expect(showIssueService.findActiveAutomatedIssueByShowPlatformViolation).toHaveBeenCalledTimes(25);
    });
  });

  describe('normalizeViolationSeverity', () => {
    it.each([
      ['CRITICAL', 'CRITICAL'],
      ['HIGH', 'HIGH'],
      ['ERROR', 'HIGH'],
      ['SEVERE', 'HIGH'],
      ['WARNING', 'MEDIUM'],
      ['WARN', 'MEDIUM'],
      ['MEDIUM', 'MEDIUM'],
      ['UNKNOWN_VALUE', 'LOW'],
      ['', 'LOW'],
    ] as const)('normalizes %s to %s', (source, expected) => {
      expect(normalizeViolationSeverity(source)).toBe(expected);
    });
  });
});
