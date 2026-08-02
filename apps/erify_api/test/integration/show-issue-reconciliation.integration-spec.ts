import 'reflect-metadata';

import { Injectable, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ClsPluginTransactional, Transactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule, ClsService } from 'nestjs-cls';

import { AuditModule } from '@/models/audit/audit.module';
import { ShowModule } from '@/models/show/show.module';
import { ShowCreatorModule } from '@/models/show-creator/show-creator.module';
import { ShowPlatformModule } from '@/models/show-platform/show-platform.module';
import { ShowPlatformViolationModule } from '@/models/show-platform-violation/show-platform-violation.module';
import { CreatorAttendanceMissingExtractor } from '@/orchestration/fact-extraction/extractors/creator-attendance-missing.extractor';
import type {
  ExtractedFact,
  ExtractionContext,
} from '@/orchestration/fact-extraction/extractors/extractor.types';
import { ShowPlatformViolationExtractor } from '@/orchestration/fact-extraction/extractors/show-platform-violation.extractor';
import { FactExtractionProcessor } from '@/orchestration/fact-extraction/fact-extraction.processor';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { ShowIssueOrchestrationModule } from '@/show-issue-orchestration/show-issue-orchestration.module';

const INTEGRATION_NAME_PREFIX = 'integration-show-issue-reconciliation:';

function uniqueSuffix(): string {
  return `${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

/**
 * Mirrors `FactExtractionService.extractFromTask`'s per-fact call into
 * `FactExtractionProcessor.applyAndAudit` — this is the exact
 * `@Transactional()` boundary the design doc's "Transaction boundary"
 * section describes, exercised here with the REAL registered extractors
 * (not mocks) against a real Postgres database, without needing a full
 * task-template-driven submission through `TaskOrchestrationService`.
 */
@Module({
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
    PrismaModule,
    ShowModule,
    ShowCreatorModule,
    ShowPlatformModule,
    ShowPlatformViolationModule,
    AuditModule,
    ShowIssueOrchestrationModule,
  ],
  providers: [
    FactExtractionProcessor,
    CreatorAttendanceMissingExtractor,
    ShowPlatformViolationExtractor,
  ],
  exports: [
    FactExtractionProcessor,
    CreatorAttendanceMissingExtractor,
    ShowPlatformViolationExtractor,
  ],
})
class ReconciliationHarnessModule {}

@Injectable()
class ReconciliationTransactionProbe {
  constructor(private readonly processor: FactExtractionProcessor) {}

  @Transactional<TransactionalAdapterPrisma>()
  async applyAndFail(
    extractor: CreatorAttendanceMissingExtractor,
    fact: ExtractedFact,
    ctx: ExtractionContext,
    targetIds: { targetType: 'SHOW_CREATOR'; targetId: bigint }[],
  ): Promise<never> {
    await this.processor.applyAndAudit(extractor, fact, ctx, targetIds);
    throw new Error('reconciliation rollback probe');
  }
}

describe('real database show-issue reconciliation transaction safety', () => {
  let moduleRef: TestingModule;
  let clsService: ClsService;
  let prisma: PrismaService;
  let processor: FactExtractionProcessor;
  let attendanceExtractor: CreatorAttendanceMissingExtractor;
  let violationExtractor: ShowPlatformViolationExtractor;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ReconciliationHarnessModule],
      providers: [ReconciliationTransactionProbe],
    }).compile();

    await moduleRef.init();

    clsService = moduleRef.get(ClsService);
    prisma = moduleRef.get(PrismaService);
    processor = moduleRef.get(FactExtractionProcessor);
    attendanceExtractor = moduleRef.get(CreatorAttendanceMissingExtractor);
    violationExtractor = moduleRef.get(ShowPlatformViolationExtractor);
  });

  afterEach(async () => {
    // Cascades ShowCreator / ShowPlatform / ShowPlatformViolation / ShowIssue
    // via Show.onDelete: Cascade FK.
    await prisma.show.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.task.deleteMany({ where: { description: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.showType.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.showStatus.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.showStandard.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.client.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.platform.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.creator.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.studio.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  async function createShowFixture(suffix: string) {
    const studio = await prisma.studio.create({
      data: { uid: `studio_irc_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}studio:${suffix}`, address: '123 Test St', metadata: {} },
    });
    const client = await prisma.client.create({
      data: {
        uid: `client_irc_${suffix}`,
        name: `${INTEGRATION_NAME_PREFIX}client:${suffix}`,
        contactPerson: 'Integration Test',
        contactEmail: `integration-show-issue-recon-${suffix}@example.com`,
        metadata: {},
      },
    });
    const showType = await prisma.showType.create({
      data: { uid: `shtp_irc_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}type:${suffix}`, metadata: {} },
    });
    const showStatus = await prisma.showStatus.create({
      data: { uid: `shst_irc_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}status:${suffix}`, metadata: {} },
    });
    const showStandard = await prisma.showStandard.create({
      data: { uid: `shsd_irc_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}standard:${suffix}`, metadata: {} },
    });
    const show = await prisma.show.create({
      data: {
        uid: `show_irc_${suffix}`,
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
    return { studio, client, show };
  }

  async function createShowCreatorFixture(suffix: string, showId: bigint) {
    const creator = await prisma.creator.create({
      data: { uid: `creator_irc_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}creator:${suffix}`, aliasName: 'Alias', metadata: {} },
    });
    const showCreator = await prisma.showCreator.create({
      data: { uid: `show_mc_irc_${suffix}`, show: { connect: { id: showId } }, creator: { connect: { id: creator.id } }, metadata: {} },
    });
    return showCreator;
  }

  async function createShowPlatformFixture(suffix: string, showId: bigint) {
    const platform = await prisma.platform.create({
      data: { uid: `plat_irc_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}platform:${suffix}`, apiConfig: {}, metadata: {} },
    });
    const showPlatform = await prisma.showPlatform.create({
      data: { uid: `show_plt_irc_${suffix}`, show: { connect: { id: showId } }, platform: { connect: { id: platform.id } }, metadata: {} },
    });
    return showPlatform;
  }

  async function createTaskFixture(suffix: string) {
    return prisma.task.create({
      data: {
        uid: `task_irc_${suffix}`,
        description: `${INTEGRATION_NAME_PREFIX}task:${suffix}`,
        type: 'ACTIVE',
        content: {},
        metadata: {},
      },
    });
  }

  function attendanceFact(showCreatorUid: string, overrides: Partial<ExtractedFact> = {}): ExtractedFact {
    return {
      contentKey: `fld_attendmiss1:creator:${showCreatorUid}`,
      sourceFieldId: 'fld_attendmiss1',
      factKey: 'creator_attendance_missing',
      scope: 'creator',
      targetUid: showCreatorUid,
      rawValue: true,
      reason: 'Sick leave.',
      ...overrides,
    };
  }

  function baseCtx(showId: bigint, showUid: string, taskId = 1n, taskUid = 'task_irc_placeholder'): ExtractionContext {
    return {
      taskId,
      taskUid,
      studioId: null,
      showId,
      showUid,
      source: 'OPERATOR',
    };
  }

  it('atomically writes the attendance fact, extraction audit, and one automated ShowIssue', async () => {
    const suffix = uniqueSuffix();
    const { show } = await createShowFixture(suffix);
    const showCreator = await createShowCreatorFixture(suffix, show.id);
    const ctx = baseCtx(show.id, show.uid);
    const targetIds = [{ targetType: 'SHOW_CREATOR' as const, targetId: showCreator.id }];

    await clsService.run(() =>
      processor.applyAndAudit(attendanceExtractor, attendanceFact(showCreator.uid), ctx, targetIds));

    const updatedCreator = await prisma.showCreator.findUniqueOrThrow({ where: { id: showCreator.id } });
    expect(updatedCreator.attendanceMissing).toBe(true);

    const issues = await prisma.showIssue.findMany({ where: { showCreatorId: showCreator.id } });
    expect(issues).toHaveLength(1);
    expect(issues[0]!.status).toBe('OPEN');
    expect(issues[0]!.origin).toBe('FACT_EXTRACTION');
    expect(issues[0]!.category).toBe('CREATOR_ATTENDANCE');
    expect(issues[0]!.evidence).toBe('Sick leave.');

    const auditCount = await prisma.audit.count({
      where: { targets: { some: { showIssueId: issues[0]!.id } } },
    });
    expect(auditCount).toBe(1);
  });

  it('correcting to present resolves the issue without creating a duplicate, and both states replay idempotently', async () => {
    const suffix = uniqueSuffix();
    const { show } = await createShowFixture(suffix);
    const showCreator = await createShowCreatorFixture(suffix, show.id);
    const ctx = baseCtx(show.id, show.uid);
    const targetIds = [{ targetType: 'SHOW_CREATOR' as const, targetId: showCreator.id }];

    await clsService.run(() =>
      processor.applyAndAudit(attendanceExtractor, attendanceFact(showCreator.uid), ctx, targetIds));

    // Replay the missing state — must not create a second issue or a
    // second audit row (value_unchanged short-circuits before reconciliation
    // even runs).
    await clsService.run(() =>
      processor.applyAndAudit(attendanceExtractor, attendanceFact(showCreator.uid), ctx, targetIds));
    let issues = await prisma.showIssue.findMany({ where: { showCreatorId: showCreator.id } });
    expect(issues).toHaveLength(1);

    // Correct to present.
    await clsService.run(() =>
      processor.applyAndAudit(
        attendanceExtractor,
        attendanceFact(showCreator.uid, { rawValue: false, reason: undefined }),
        ctx,
        targetIds,
      ));
    issues = await prisma.showIssue.findMany({ where: { showCreatorId: showCreator.id } });
    expect(issues).toHaveLength(1);
    expect(issues[0]!.status).toBe('RESOLVED');
    expect(issues[0]!.resolutionCode).toBe('SOURCE_CORRECTED');
    expect(issues[0]!.resolvedById).toBeNull();

    // Replay present. Reset `actuals_source` first so the EXTRACTOR itself
    // doesn't idempotency-short-circuit before ever reaching reconciliation
    // (its own `recordedSource === ctx.source` check would otherwise noop
    // this resubmission on its own) — this exercises
    // `ShowIssueReconciliationService`'s own replay-idempotency on the
    // `attendance_present` signal specifically: still exactly one (resolved)
    // issue row and no extra resolve audit.
    const auditCountBeforeReplay = await prisma.audit.count({
      where: { targets: { some: { showIssueId: issues[0]!.id } } },
    });
    await prisma.showCreator.update({ where: { id: showCreator.id }, data: { metadata: { actuals_source: {} } } });
    await clsService.run(() =>
      processor.applyAndAudit(
        attendanceExtractor,
        attendanceFact(showCreator.uid, { rawValue: false, reason: undefined }),
        ctx,
        targetIds,
      ));
    const auditCountAfterReplay = await prisma.audit.count({
      where: { targets: { some: { showIssueId: issues[0]!.id } } },
    });
    expect(auditCountAfterReplay).toBe(auditCountBeforeReplay);
    issues = await prisma.showIssue.findMany({ where: { showCreatorId: showCreator.id } });
    expect(issues).toHaveLength(1);
  });

  it('creating then superseding a platform violation creates and source-resolves exactly one issue', async () => {
    const suffix = uniqueSuffix();
    const { show } = await createShowFixture(suffix);
    const showPlatform = await createShowPlatformFixture(suffix, show.id);
    const task = await createTaskFixture(suffix);
    const ctx = baseCtx(show.id, show.uid, task.id, task.uid);
    const targetIds = [{ targetType: 'SHOW_PLATFORM' as const, targetId: showPlatform.id }];
    const fact: ExtractedFact = {
      contentKey: `fld_violate1:platform:${showPlatform.uid}`,
      sourceFieldId: 'fld_violate1',
      factKey: 'show_platform_violation',
      scope: 'platform',
      targetUid: showPlatform.uid,
      rawValue: ['COPYRIGHT'],
      reason: 'Copyright warning from platform',
    };

    await clsService.run(() =>
      processor.applyAndAudit(violationExtractor, fact, ctx, targetIds));

    const violationRows = await prisma.showPlatformViolation.findMany({ where: { showPlatformId: showPlatform.id } });
    expect(violationRows).toHaveLength(1);

    let issues = await prisma.showIssue.findMany({ where: { showPlatformViolationId: violationRows[0]!.id } });
    expect(issues).toHaveLength(1);
    expect(issues[0]!.status).toBe('OPEN');
    expect(issues[0]!.category).toBe('PLATFORM_VIOLATION');
    expect(issues[0]!.severity).toBe('MEDIUM'); // 'WARNING' (default) normalizes to MEDIUM

    // Supersede by submitting a different violation set for the same field —
    // the old row is superseded and a new one created, so the old issue
    // resolves and a new issue is created for the new violation row.
    const supersedeFact: ExtractedFact = { ...fact, rawValue: ['DEFAMATION'] };
    await clsService.run(() =>
      processor.applyAndAudit(violationExtractor, supersedeFact, ctx, targetIds));

    const oldIssue = await prisma.showIssue.findUniqueOrThrow({ where: { id: issues[0]!.id } });
    expect(oldIssue.status).toBe('RESOLVED');
    expect(oldIssue.resolutionCode).toBe('SOURCE_CORRECTED');

    const allViolationRows = await prisma.showPlatformViolation.findMany({ where: { showPlatformId: showPlatform.id } });
    expect(allViolationRows).toHaveLength(2);
    const newViolationRow = allViolationRows.find((row) => row.id !== violationRows[0]!.id)!;
    issues = await prisma.showIssue.findMany({ where: { showPlatformViolationId: newViolationRow.id } });
    expect(issues).toHaveLength(1);
    expect(issues[0]!.status).toBe('OPEN');
  });

  it('rolls back the fact write, extraction audit, and any ShowIssue write together when the enclosing transaction later throws', async () => {
    // Mirrors `ShowIssueTransactionProbe.createAndFail` in
    // show-issue-persistence.integration-spec.ts: a throw anywhere inside
    // the same `@Transactional()` scope as `applyAndAudit` — which now
    // includes reconciliation — must roll back everything written in that
    // scope. `fact-extraction.processor.spec.ts` covers the narrower unit
    // claim that reconciliation itself throwing propagates and is not
    // swallowed; this proves the real Postgres transaction actually rolls
    // the ShowCreator write, the extraction audit, and the reconciled
    // ShowIssue back together.
    const suffix = uniqueSuffix();
    const { show } = await createShowFixture(suffix);
    const showCreator = await createShowCreatorFixture(suffix, show.id);
    const ctx = baseCtx(show.id, show.uid);
    const targetIds = [{ targetType: 'SHOW_CREATOR' as const, targetId: showCreator.id }];
    const probe = moduleRef.get(ReconciliationTransactionProbe);

    await expect(
      clsService.run(() => probe.applyAndFail(attendanceExtractor, attendanceFact(showCreator.uid), ctx, targetIds)),
    ).rejects.toThrow('reconciliation rollback probe');

    const untouchedCreator = await prisma.showCreator.findUniqueOrThrow({ where: { id: showCreator.id } });
    expect(untouchedCreator.attendanceMissing).toBe(false);

    const issues = await prisma.showIssue.findMany({ where: { showCreatorId: showCreator.id } });
    expect(issues).toHaveLength(0);

    const auditCount = await prisma.audit.count({
      where: { targets: { some: { showCreatorId: showCreator.id } } },
    });
    expect(auditCount).toBe(0);
  });
});
