import { Prisma } from '@prisma/client';

import type { ShowIssueWithRelations } from './schemas/show-issue.schema';
import type { ShowIssueRepository } from './show-issue.repository';
import { ShowIssueService } from './show-issue.service';

import { PRISMA_ERROR } from '@/lib/errors/prisma-error-codes';
import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import type { UidGeneratorService } from '@/lib/uid/uid-generator.service';

function createShowIssue(overrides: Partial<ShowIssueWithRelations> = {}): ShowIssueWithRelations {
  return {
    id: 1n,
    uid: 'issue_test123',
    showId: 10n,
    category: 'EQUIPMENT',
    origin: 'MANUAL',
    severity: 'MEDIUM',
    status: 'OPEN',
    title: 'Broken mic',
    evidence: null,
    ownerId: null,
    dueAt: null,
    createdById: 5n,
    escalationLevel: 0,
    escalatedAt: null,
    escalatedById: null,
    escalationNote: null,
    resolvedAt: null,
    resolvedById: null,
    resolutionCode: null,
    resolutionNote: null,
    showCreatorId: null,
    showPlatformViolationId: null,
    version: 1,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    show: { uid: 'show_1' },
    owner: null,
    createdBy: { uid: 'user_5', name: 'Creator' },
    escalatedBy: null,
    resolvedBy: null,
    showCreator: null,
    showPlatformViolation: null,
    ...overrides,
  } as ShowIssueWithRelations;
}

describe('showIssueService', () => {
  let service: ShowIssueService;
  let repository: jest.Mocked<
    Pick<ShowIssueRepository, 'create' | 'findByUid' | 'findByUidAndStudio' | 'findPaginated' | 'updateWithVersionCheck' | 'countUnresolvedBySeverity'>
  >;
  let uidGenerator: jest.Mocked<Pick<UidGeneratorService, 'generateBrandedId'>>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findByUid: jest.fn(),
      findByUidAndStudio: jest.fn(),
      findPaginated: jest.fn(),
      updateWithVersionCheck: jest.fn(),
      countUnresolvedBySeverity: jest.fn(),
    };
    uidGenerator = { generateBrandedId: jest.fn().mockReturnValue('issue_test123') };

    service = new ShowIssueService(
      repository as unknown as ShowIssueRepository,
      uidGenerator as unknown as UidGeneratorService,
    );
  });

  describe('createShowIssue', () => {
    it('creates a MANUAL issue with no automated source connects', async () => {
      const created = createShowIssue();
      repository.create.mockResolvedValue(created);

      await expect(
        service.createShowIssue({
          showId: 10n,
          category: 'EQUIPMENT',
          origin: 'MANUAL',
          severity: 'MEDIUM',
          title: 'Broken mic',
          createdById: 5n,
        }),
      ).resolves.toBe(created);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'issue_test123',
          show: { connect: { id: 10n } },
          category: 'EQUIPMENT',
          origin: 'MANUAL',
          severity: 'MEDIUM',
          title: 'Broken mic',
          showCreator: undefined,
          showPlatformViolation: undefined,
        }),
      );
    });

    it('rejects FACT_EXTRACTION with no typed automated source', async () => {
      await expect(
        service.createShowIssue({
          showId: 10n,
          category: 'CREATOR_ATTENDANCE',
          origin: 'FACT_EXTRACTION',
          severity: 'LOW',
          title: 'Attendance missing',
        }),
      ).rejects.toThrow('FACT_EXTRACTION issues require exactly one typed automated source.');
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects FACT_EXTRACTION with both typed automated sources set', async () => {
      await expect(
        service.createShowIssue({
          showId: 10n,
          category: 'CREATOR_ATTENDANCE',
          origin: 'FACT_EXTRACTION',
          severity: 'LOW',
          title: 'Attendance missing',
          showCreatorId: 2n,
          showPlatformViolationId: 3n,
        }),
      ).rejects.toThrow('FACT_EXTRACTION issues require exactly one typed automated source.');
    });

    it('rejects MANUAL issues that set an automated source', async () => {
      await expect(
        service.createShowIssue({
          showId: 10n,
          category: 'PLATFORM_VIOLATION',
          origin: 'MANUAL',
          severity: 'LOW',
          title: 'Bad',
          showPlatformViolationId: 3n,
        }),
      ).rejects.toThrow('MANUAL issues must not set an automated source.');
    });

    it('translates a duplicate creator/category/origin identity into a 409', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: PRISMA_ERROR.UniqueConstraint,
        clientVersion: '5.0.0',
      });
      repository.create.mockRejectedValue(error);

      await expect(
        service.createShowIssue({
          showId: 10n,
          category: 'CREATOR_ATTENDANCE',
          origin: 'FACT_EXTRACTION',
          severity: 'LOW',
          title: 'Attendance missing',
          showCreatorId: 2n,
        }),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe('updateShowIssueFields', () => {
    it('bumps version and forwards only the provided fields', async () => {
      const current = createShowIssue({ version: 3 });
      const updated = createShowIssue({ version: 4, title: 'New title' });
      repository.updateWithVersionCheck.mockResolvedValue(updated);

      await expect(
        service.updateShowIssueFields(current, 3, { title: 'New title' }),
      ).resolves.toBe(updated);

      expect(repository.updateWithVersionCheck).toHaveBeenCalledWith(
        { uid: current.uid, version: 3 },
        { title: 'New title', version: 4 },
      );
    });

    // Regression test: the caller (ShowIssueWorkflowService) re-fetches
    // `current` fresh from the DB for authorization checks, which can be
    // AHEAD of the client's last-known version. The optimistic-lock write
    // must use the caller-supplied `expectedVersion` (what the client
    // actually read), never `current.version` — otherwise a stale write
    // always "succeeds" because it is checked against itself.
    it('uses expectedVersion for the optimistic-lock check, not current.version', async () => {
      const current = createShowIssue({ version: 5 }); // fresher than the client's belief
      const updated = createShowIssue({ version: 3 });
      repository.updateWithVersionCheck.mockResolvedValue(updated);

      await service.updateShowIssueFields(current, 2, { title: 'New title' });

      expect(repository.updateWithVersionCheck).toHaveBeenCalledWith(
        { uid: current.uid, version: 2 },
        { title: 'New title', version: 3 },
      );
    });

    it('rejects starting (IN_PROGRESS) a resolved issue', async () => {
      const current = createShowIssue({ status: 'RESOLVED' });
      await expect(
        service.updateShowIssueFields(current, current.version, { status: 'IN_PROGRESS' }),
      ).rejects.toThrow('Cannot start a resolved issue; reopen it first.');
      expect(repository.updateWithVersionCheck).not.toHaveBeenCalled();
    });

    it('rejects re-starting an already IN_PROGRESS issue (no-op transition)', async () => {
      const current = createShowIssue({ status: 'IN_PROGRESS' });
      await expect(
        service.updateShowIssueFields(current, current.version, { status: 'IN_PROGRESS' }),
      ).rejects.toThrow('Issue is already in progress.');
      expect(repository.updateWithVersionCheck).not.toHaveBeenCalled();
    });

    it('rejects a category change on a FACT_EXTRACTION issue (reconciliation identity)', async () => {
      const current = createShowIssue({ origin: 'FACT_EXTRACTION', showCreatorId: 7n });
      await expect(
        service.updateShowIssueFields(current, current.version, { category: 'OTHER' }),
      ).rejects.toThrow('Category cannot be changed for an automated issue — it is part of the reconciliation identity.');
      expect(repository.updateWithVersionCheck).not.toHaveBeenCalled();
    });

    it('translates a stale version into a 409', async () => {
      const current = createShowIssue({ version: 3 });
      repository.updateWithVersionCheck.mockRejectedValue(
        new VersionConflictError('stale', 3, 4),
      );

      await expect(
        service.updateShowIssueFields(current, 3, { title: 'New title' }),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe('resolveShowIssue', () => {
    it('sets status RESOLVED with resolution fields and bumps version', async () => {
      const current = createShowIssue({ version: 2 });
      const resolved = createShowIssue({ status: 'RESOLVED', version: 3 });
      repository.updateWithVersionCheck.mockResolvedValue(resolved);

      await expect(
        service.resolveShowIssue(current, 2, {
          resolvedById: 9n,
          resolutionCode: 'FIXED',
          resolutionNote: 'Replaced the mic',
        }),
      ).resolves.toBe(resolved);

      expect(repository.updateWithVersionCheck).toHaveBeenCalledWith(
        { uid: current.uid, version: 2 },
        expect.objectContaining({
          status: 'RESOLVED',
          resolvedAt: expect.any(Date),
          resolvedBy: { connect: { id: 9n } },
          resolutionCode: 'FIXED',
          resolutionNote: 'Replaced the mic',
          version: 3,
        }),
      );
    });

    it('rejects resolving an already-resolved issue', async () => {
      const current = createShowIssue({ status: 'RESOLVED' });
      await expect(
        service.resolveShowIssue(current, current.version, {
          resolvedById: 9n,
          resolutionCode: 'FIXED',
          resolutionNote: 'note',
        }),
      ).rejects.toThrow('Issue is already resolved.');
    });
  });

  describe('reopenShowIssue', () => {
    it('clears resolution fields and returns the issue to OPEN', async () => {
      const current = createShowIssue({
        status: 'RESOLVED',
        version: 4,
        resolvedAt: new Date(),
        resolvedById: 9n,
        resolutionCode: 'FIXED',
        resolutionNote: 'note',
      });
      const reopened = createShowIssue({ status: 'OPEN', version: 5 });
      repository.updateWithVersionCheck.mockResolvedValue(reopened);

      await expect(service.reopenShowIssue(current, 4)).resolves.toBe(reopened);

      expect(repository.updateWithVersionCheck).toHaveBeenCalledWith(
        { uid: current.uid, version: 4 },
        {
          status: 'OPEN',
          resolvedAt: null,
          resolvedBy: { disconnect: true },
          resolutionCode: null,
          resolutionNote: null,
          version: 5,
        },
      );
    });

    it('rejects reopening an issue that is not resolved', async () => {
      const current = createShowIssue({ status: 'OPEN' });
      await expect(service.reopenShowIssue(current, current.version)).rejects.toThrow(
        'Only a resolved issue can be reopened.',
      );
    });
  });

  describe('getUnresolvedIssueSeverityCounts', () => {
    it('delegates to the repository aggregation', async () => {
      const counts = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 0 };
      repository.countUnresolvedBySeverity.mockResolvedValue(counts);

      await expect(
        service.getUnresolvedIssueSeverityCounts({ studioUid: 'std_1' }),
      ).resolves.toBe(counts);
      expect(repository.countUnresolvedBySeverity).toHaveBeenCalledWith({ studioUid: 'std_1' });
    });
  });

  describe('escalateShowIssue', () => {
    it('increments the escalation level and records the escalator', async () => {
      const current = createShowIssue({ version: 1 });
      const escalated = createShowIssue({ escalationLevel: 1, version: 2 });
      repository.updateWithVersionCheck.mockResolvedValue(escalated);

      await expect(
        service.escalateShowIssue(current, 1, { escalatedById: 7n, escalationNote: 'Client is asking' }),
      ).resolves.toBe(escalated);

      expect(repository.updateWithVersionCheck).toHaveBeenCalledWith(
        { uid: current.uid, version: 1 },
        expect.objectContaining({
          escalationLevel: { increment: 1 },
          escalatedAt: expect.any(Date),
          escalatedBy: { connect: { id: 7n } },
          escalationNote: 'Client is asking',
          version: 2,
        }),
      );
    });

    it('rejects escalating a resolved issue', async () => {
      const current = createShowIssue({ status: 'RESOLVED' });
      await expect(
        service.escalateShowIssue(current, current.version, { escalatedById: 7n }),
      ).rejects.toThrow('Cannot escalate a resolved issue.');
    });
  });
});
