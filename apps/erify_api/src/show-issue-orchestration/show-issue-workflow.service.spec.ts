import { Module } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';

import { ShowIssueWorkflowService } from './show-issue-workflow.service';

import { AuditService } from '@/models/audit/audit.service';
import { StudioMembershipService } from '@/models/membership/studio-membership.service';
import { ShowService } from '@/models/show/show.service';
import type { ShowIssueWithRelations } from '@/models/show-issue/schemas/show-issue.schema';
import { ShowIssueService } from '@/models/show-issue/show-issue.service';
import { UserService } from '@/models/user/user.service';
import { PrismaService } from '@/prisma/prisma.service';

function createShowIssue(overrides: Partial<ShowIssueWithRelations> = {}): ShowIssueWithRelations {
  return {
    id: 1n,
    uid: 'issue_1',
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

const ACTOR = { id: 99n, uid: 'user_99', name: 'Manager Mia', extId: 'ext_99' };
const MEMBER = { id: 42n, uid: 'user_42', name: 'Member Max', extId: 'ext_42' };

// `@Transactional()` requires the ClsPluginTransactional DI proxy to be
// active, which only happens through a real Nest DI container — a plain
// `new ShowIssueWorkflowService(...)` throws "TransactionHost not
// initialized". Mirrors StudioShowManagementService.spec.ts's harness: a
// mock PrismaService whose `$transaction` immediately invokes the callback.
const mockPrismaForCls = {
  $transaction: jest.fn(async (callback: any) => callback({})),
};

@Module({
  providers: [{ provide: PrismaService, useValue: mockPrismaForCls }],
  exports: [PrismaService],
})
class MockPrismaModule {}

describe('showIssueWorkflowService', () => {
  let service: ShowIssueWorkflowService;

  const showIssueServiceMock = {
    createShowIssue: jest.fn(),
    getShowIssueByUidAndStudio: jest.fn(),
    listShowIssues: jest.fn(),
    updateShowIssueFields: jest.fn(),
    resolveShowIssue: jest.fn(),
    reopenShowIssue: jest.fn(),
    escalateShowIssue: jest.fn(),
  };
  const showServiceMock = { findByUidAndStudioUid: jest.fn() };
  const studioMembershipServiceMock = { findStudioMemberByUserAndStudio: jest.fn() };
  const userServiceMock = { getUserByExtId: jest.fn() };
  const auditServiceMock = { create: jest.fn(), countForTargets: jest.fn(), findForTargets: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ClsModule.forRoot({
          global: true,
          middleware: { mount: false },
          plugins: [
            new ClsPluginTransactional({
              imports: [MockPrismaModule],
              adapter: new TransactionalAdapterPrisma({
                prismaInjectionToken: PrismaService,
              }),
            }),
          ],
        }),
      ],
      providers: [
        ShowIssueWorkflowService,
        { provide: ShowIssueService, useValue: showIssueServiceMock },
        { provide: ShowService, useValue: showServiceMock },
        { provide: StudioMembershipService, useValue: studioMembershipServiceMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: AuditService, useValue: auditServiceMock },
      ],
    }).compile();

    service = module.get(ShowIssueWorkflowService);

    userServiceMock.getUserByExtId.mockImplementation(async (extId: string) => {
      if (extId === ACTOR.extId)
        return ACTOR as any;
      if (extId === MEMBER.extId)
        return MEMBER as any;
      return null;
    });
  });

  describe('createShowIssue', () => {
    it('resolves the show and creates a MANUAL issue with an audit CREATE row', async () => {
      showServiceMock.findByUidAndStudioUid.mockResolvedValue({ id: 10n } as any);
      const created = createShowIssue();
      showIssueServiceMock.createShowIssue.mockResolvedValue(created);

      const result = await service.createShowIssue(
        'std_1',
        { showId: 'show_1', category: 'EQUIPMENT', severity: 'MEDIUM', title: 'Broken mic' } as any,
        ACTOR.extId,
      );

      expect(result.id).toBe('issue_1');
      expect(showIssueServiceMock.createShowIssue).toHaveBeenCalledWith(
        expect.objectContaining({ showId: 10n, origin: 'MANUAL', createdById: ACTOR.id }),
      );
      expect(auditServiceMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          actorId: ACTOR.id,
          targets: [{ targetType: 'SHOW_ISSUE', targetId: created.id }],
        }),
      );
    });

    it('rejects an owner who is not an active member of the studio', async () => {
      showServiceMock.findByUidAndStudioUid.mockResolvedValue({ id: 10n } as any);
      studioMembershipServiceMock.findStudioMemberByUserAndStudio.mockResolvedValue(null);

      await expect(
        service.createShowIssue(
          'std_1',
          { showId: 'show_1', category: 'EQUIPMENT', severity: 'MEDIUM', title: 'Broken mic', ownerId: 'user_404' } as any,
          ACTOR.extId,
        ),
      ).rejects.toThrow('Owner must be an active member of this studio.');
    });

    it('rejects an unknown actor extId', async () => {
      await expect(
        service.createShowIssue('std_1', { showId: 'show_1' } as any, 'ext_unknown'),
      ).rejects.toMatchObject({ status: 401 });
    });
  });

  describe('updateShowIssue — authorization matrix', () => {
    it('lets Admin/Manager edit any field on any issue', async () => {
      const issue = createShowIssue({ owner: { uid: MEMBER.uid, name: MEMBER.name } as any });
      showIssueServiceMock.getShowIssueByUidAndStudio.mockResolvedValue(issue);
      showIssueServiceMock.updateShowIssueFields.mockResolvedValue(issue);

      await expect(
        service.updateShowIssue('std_1', 'issue_1', { version: 1, severity: 'HIGH' } as any, ACTOR.extId, 'admin'),
      ).resolves.toBeDefined();

      expect(showIssueServiceMock.updateShowIssueFields).toHaveBeenCalledWith(
        issue,
        1,
        expect.objectContaining({ severity: 'HIGH' }),
      );
    });

    it('lets the assigned member start (IN_PROGRESS) their own issue', async () => {
      const issue = createShowIssue({ owner: { uid: MEMBER.uid, name: MEMBER.name } as any });
      showIssueServiceMock.getShowIssueByUidAndStudio.mockResolvedValue(issue);
      showIssueServiceMock.updateShowIssueFields.mockResolvedValue(issue);

      await expect(
        service.updateShowIssue('std_1', 'issue_1', { status: 'IN_PROGRESS' } as any, MEMBER.extId, 'member'),
      ).resolves.toBeDefined();
    });

    it('forbids the assigned member from editing any other field alongside status', async () => {
      const issue = createShowIssue({ owner: { uid: MEMBER.uid, name: MEMBER.name } as any });
      showIssueServiceMock.getShowIssueByUidAndStudio.mockResolvedValue(issue);

      await expect(
        service.updateShowIssue(
          'std_1',
          'issue_1',
          { status: 'IN_PROGRESS', severity: 'HIGH' } as any,
          MEMBER.extId,
          'member',
        ),
      ).rejects.toMatchObject({ status: 403 });
      expect(showIssueServiceMock.updateShowIssueFields).not.toHaveBeenCalled();
    });

    it('forbids a member from starting an issue assigned to someone else', async () => {
      const issue = createShowIssue({ owner: { uid: 'user_other', name: 'Other' } as any });
      showIssueServiceMock.getShowIssueByUidAndStudio.mockResolvedValue(issue);

      await expect(
        service.updateShowIssue('std_1', 'issue_1', { status: 'IN_PROGRESS' } as any, MEMBER.extId, 'member'),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('forbids an unassigned member from editing at all', async () => {
      const issue = createShowIssue({ owner: null });
      showIssueServiceMock.getShowIssueByUidAndStudio.mockResolvedValue(issue);

      await expect(
        service.updateShowIssue('std_1', 'issue_1', { severity: 'HIGH' } as any, MEMBER.extId, 'member'),
      ).rejects.toMatchObject({ status: 403 });
    });
  });

  describe('resolveShowIssue — authorization matrix', () => {
    it('lets the assigned member resolve their own issue', async () => {
      const issue = createShowIssue({ owner: { uid: MEMBER.uid, name: MEMBER.name } as any });
      showIssueServiceMock.getShowIssueByUidAndStudio.mockResolvedValue(issue);
      showIssueServiceMock.resolveShowIssue.mockResolvedValue(issue);

      await expect(
        service.resolveShowIssue(
          'std_1',
          'issue_1',
          { resolutionCode: 'FIXED', resolutionNote: 'done' } as any,
          MEMBER.extId,
          'member',
        ),
      ).resolves.toBeDefined();
    });

    it('forbids a non-assigned member from resolving', async () => {
      const issue = createShowIssue({ owner: { uid: 'user_other', name: 'Other' } as any });
      showIssueServiceMock.getShowIssueByUidAndStudio.mockResolvedValue(issue);

      await expect(
        service.resolveShowIssue(
          'std_1',
          'issue_1',
          { resolutionCode: 'FIXED', resolutionNote: 'done' } as any,
          MEMBER.extId,
          'member',
        ),
      ).rejects.toMatchObject({ status: 403 });
    });
  });

  describe('getShowIssueAudits', () => {
    it('scopes audit lookup to the SHOW_ISSUE target', async () => {
      const issue = createShowIssue();
      showIssueServiceMock.getShowIssueByUidAndStudio.mockResolvedValue(issue);
      auditServiceMock.countForTargets.mockResolvedValue(1);
      auditServiceMock.findForTargets.mockResolvedValue([
        {
          uid: 'aud_1',
          action: 'CREATE',
          actor: { uid: ACTOR.uid },
          ipAddress: null,
          userAgent: null,
          reason: null,
          metadata: { operation: 'issue_created' },
          targets: [{ targetType: 'SHOW_ISSUE', targetId: issue.id, showIssue: { uid: issue.uid } }],
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        } as any,
      ]);

      const result = await service.getShowIssueAudits('std_1', 'issue_1', { skip: 0, take: 25 });

      expect(auditServiceMock.countForTargets).toHaveBeenCalledWith([{ targetType: 'SHOW_ISSUE', targetId: issue.id }]);
      expect(result.total).toBe(1);
      expect(result.items[0]).toMatchObject({ id: 'aud_1', targets: [{ target_type: 'SHOW_ISSUE', target_uid: issue.uid }] });
    });
  });
});
