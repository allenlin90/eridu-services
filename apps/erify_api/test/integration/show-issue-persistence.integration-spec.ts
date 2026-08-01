import 'reflect-metadata';

import { Injectable } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ClsPluginTransactional, Transactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule, ClsService } from 'nestjs-cls';

import type { CreateShowIssueDto } from '@/models/show-issue/schemas/show-issue.schema';
import { ShowIssueService } from '@/models/show-issue/show-issue.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { ShowIssueOrchestrationModule } from '@/show-issue-orchestration/show-issue-orchestration.module';
import { ShowIssueWorkflowService } from '@/show-issue-orchestration/show-issue-workflow.service';

const INTEGRATION_NAME_PREFIX = 'integration-show-issue:';

function uniqueSuffix(): string {
  return `${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

@Injectable()
class ShowIssueTransactionProbe {
  constructor(private readonly workflow: ShowIssueWorkflowService) {}

  @Transactional<TransactionalAdapterPrisma>()
  async createAndFail(studioUid: string, dto: CreateShowIssueDto, actorExtId: string): Promise<never> {
    await this.workflow.createShowIssue(studioUid, dto, actorExtId);
    throw new Error('show issue rollback probe');
  }
}

describe('real database Show Issue persistence safety', () => {
  let moduleRef: TestingModule;
  let clsService: ClsService;
  let prisma: PrismaService;
  let showIssueService: ShowIssueService;
  let workflow: ShowIssueWorkflowService;
  let probe: ShowIssueTransactionProbe;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        ClsModule.forRoot({
          global: true,
          plugins: [
            new ClsPluginTransactional({
              imports: [PrismaModule],
              adapter: new TransactionalAdapterPrisma({ prismaInjectionToken: PrismaService }),
            }),
          ],
        }),
        ShowIssueOrchestrationModule,
      ],
      providers: [ShowIssueTransactionProbe],
    }).compile();

    await moduleRef.init();

    clsService = moduleRef.get(ClsService);
    prisma = moduleRef.get(PrismaService);
    showIssueService = moduleRef.get(ShowIssueService);
    workflow = moduleRef.get(ShowIssueWorkflowService);
    probe = moduleRef.get(ShowIssueTransactionProbe);
  });

  afterEach(async () => {
    // Cascades show_issues via Show.onDelete: Cascade FK.
    await prisma.show.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.showType.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.showStatus.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.showStandard.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.client.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.studioMembership.deleteMany({ where: { user: { email: { startsWith: INTEGRATION_NAME_PREFIX } } } });
    await prisma.studio.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.audit.deleteMany({ where: { actorId: { not: null }, actor: { email: { startsWith: INTEGRATION_NAME_PREFIX } } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: INTEGRATION_NAME_PREFIX } } });
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  async function createFixture(suffix: string) {
    const studio = await prisma.studio.create({
      data: { uid: `studio_it_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}studio:${suffix}`, address: '123 Test St', metadata: {} },
    });
    const client = await prisma.client.create({
      data: {
        uid: `client_it_${suffix}`,
        name: `${INTEGRATION_NAME_PREFIX}client:${suffix}`,
        contactPerson: 'Integration Test',
        contactEmail: `integration-show-issue-${suffix}@example.com`,
        metadata: {},
      },
    });
    const showType = await prisma.showType.create({
      data: { uid: `shtp_it_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}type:${suffix}`, metadata: {} },
    });
    const showStatus = await prisma.showStatus.create({
      data: { uid: `shst_it_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}status:${suffix}`, metadata: {} },
    });
    const showStandard = await prisma.showStandard.create({
      data: { uid: `shsd_it_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}standard:${suffix}`, metadata: {} },
    });
    const show = await prisma.show.create({
      data: {
        uid: `show_it_${suffix}`,
        name: `${INTEGRATION_NAME_PREFIX}show:${suffix}`,
        startTime: new Date('2026-08-01T10:00:00.000Z'),
        endTime: new Date('2026-08-01T11:00:00.000Z'),
        client: { connect: { id: client.id } },
        studio: { connect: { id: studio.id } },
        showType: { connect: { id: showType.id } },
        showStatus: { connect: { id: showStatus.id } },
        showStandard: { connect: { id: showStandard.id } },
        metadata: {},
      },
    });
    const actor = await prisma.user.create({
      data: {
        uid: `user_it_actor_${suffix}`,
        extId: `ext_it_actor_${suffix}`,
        email: `${INTEGRATION_NAME_PREFIX}actor:${suffix}@example.com`,
        name: 'Integration Manager',
      },
    });
    await prisma.studioMembership.create({
      data: {
        uid: `smb_it_actor_${suffix}`,
        user: { connect: { id: actor.id } },
        studio: { connect: { id: studio.id } },
        role: 'manager',
        metadata: {},
      },
    });
    return { studio, client, show, actor };
  }

  function createDto(showUid: string, overrides: Partial<CreateShowIssueDto> = {}): CreateShowIssueDto {
    return {
      showId: showUid,
      category: 'EQUIPMENT',
      severity: 'MEDIUM',
      title: `${INTEGRATION_NAME_PREFIX}issue`,
      evidence: undefined,
      ownerId: undefined,
      dueAt: undefined,
      ...overrides,
    } as CreateShowIssueDto;
  }

  it('creates a MANUAL issue and writes a CREATE audit row in the same transaction', async () => {
    const suffix = uniqueSuffix();
    const { studio, show, actor } = await createFixture(suffix);

    const created = await clsService.run(() =>
      workflow.createShowIssue(studio.uid, createDto(show.uid), actor.extId!));

    expect(created.id).toMatch(/^issue_/);

    const row = await prisma.showIssue.findUniqueOrThrow({ where: { uid: created.id } });
    expect(row.status).toBe('OPEN');
    expect(row.version).toBe(1);

    const auditTargets = await prisma.auditTarget.findMany({
      where: { showIssueId: row.id },
      include: { audit: true },
    });
    expect(auditTargets).toHaveLength(1);
    expect(auditTargets[0].audit.action).toBe('CREATE');
    expect(auditTargets[0].targetType).toBe('SHOW_ISSUE');
  });

  it('rolls back the ShowIssue row and its audit target together when the enclosing transaction later throws', async () => {
    const suffix = uniqueSuffix();
    const { studio, show, actor } = await createFixture(suffix);

    await expect(
      clsService.run(() => probe.createAndFail(studio.uid, createDto(show.uid), actor.extId!)),
    ).rejects.toThrow('show issue rollback probe');

    await expect(prisma.showIssue.count({ where: { showId: show.id } })).resolves.toBe(0);
    await expect(
      prisma.audit.count({ where: { actorId: actor.id } }),
    ).resolves.toBe(0);
  });

  it('increments version 1 -> 2 on a version-checked field edit and 409s a replayed stale version', async () => {
    const suffix = uniqueSuffix();
    const { studio, show, actor } = await createFixture(suffix);

    const created = await clsService.run(() =>
      workflow.createShowIssue(studio.uid, createDto(show.uid), actor.extId!));
    expect(created.version).toBe(1);

    const updated = await clsService.run(() =>
      workflow.updateShowIssue(
        studio.uid,
        created.id,
        { version: 1, severity: 'HIGH' } as any,
        actor.extId!,
        'manager',
      ));
    expect(updated.version).toBe(2);
    expect(updated.severity).toBe('HIGH');

    await expect(
      clsService.run(() =>
        workflow.updateShowIssue(
          studio.uid,
          created.id,
          { version: 1, severity: 'LOW' } as any,
          actor.extId!,
          'manager',
        )),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('excludes a soft-deleted ShowIssue row from active reads', async () => {
    const suffix = uniqueSuffix();
    const { studio, show, actor } = await createFixture(suffix);

    const created = await clsService.run(() =>
      workflow.createShowIssue(studio.uid, createDto(show.uid), actor.extId!));

    await prisma.showIssue.update({
      where: { uid: created.id },
      data: { deletedAt: new Date() },
    });

    await expect(showIssueService.getShowIssueByUid(created.id)).resolves.toBeNull();
  });

  it('rejects a second FACT_EXTRACTION issue for the same ShowCreator/category/origin identity', async () => {
    const suffix = uniqueSuffix();
    const { show } = await createFixture(suffix);
    const creator = await prisma.creator.create({
      data: { uid: `creator_it_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}creator:${suffix}`, aliasName: 'Alias', metadata: {} },
    });
    const showCreator = await prisma.showCreator.create({
      data: { uid: `show_mc_it_${suffix}`, show: { connect: { id: show.id } }, creator: { connect: { id: creator.id } }, metadata: {} },
    });

    await showIssueService.createShowIssue({
      showId: show.id,
      category: 'CREATOR_ATTENDANCE',
      origin: 'FACT_EXTRACTION',
      severity: 'LOW',
      title: 'Attendance missing',
      showCreatorId: showCreator.id,
    });

    await expect(
      showIssueService.createShowIssue({
        showId: show.id,
        category: 'CREATOR_ATTENDANCE',
        origin: 'FACT_EXTRACTION',
        severity: 'LOW',
        title: 'Attendance missing (duplicate)',
        showCreatorId: showCreator.id,
      }),
    ).rejects.toMatchObject({ status: 409 });

    await prisma.showCreator.deleteMany({ where: { showId: show.id } });
    await prisma.creator.deleteMany({ where: { uid: creator.uid } });
  });
});
