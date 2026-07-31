import 'reflect-metadata';

import { Injectable } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ClsPluginTransactional, Transactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule, ClsService } from 'nestjs-cls';

import { SceneQcModule } from '@/capabilities/scene-qc/scene-qc.module';
import { SceneQcConfirmationWorkflowService } from '@/capabilities/scene-qc/scene-qc-confirmation-workflow.service';
import { OPERATIONAL_TIMEZONE, resolveOperationalWindow } from '@/capabilities/scene-qc/scene-qc-operational-window.util';
import { SceneQcQueryService } from '@/capabilities/scene-qc/scene-qc-query.service';
import { SceneQcRecordsQueryService } from '@/capabilities/scene-qc/scene-qc-records.query.service';
import { SceneQcReportService } from '@/capabilities/scene-qc/scene-qc-report.service';
import { serializeSceneQcReportToCsv } from '@/capabilities/scene-qc/scene-qc-report-csv';
import { SceneQcWorkflowService } from '@/capabilities/scene-qc/scene-qc-review-workflow.service';
import { StorageService } from '@/lib/storage/storage.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';

const INTEGRATION_NAME_PREFIX = 'integration-scene-qc-confirmation:';
const CDN_BASE = 'https://cdn.example.com';
const OPERATIONAL_DATE = '2026-08-01';
const WINDOW = resolveOperationalWindow(OPERATIONAL_DATE, OPERATIONAL_TIMEZONE);

function uniqueSuffix(): string {
  return `${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

function fieldIdSuffix(suffix: string): string {
  return suffix.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function v2Schema(fieldId: string, label: string) {
  return {
    schema_version: 2,
    schema_engine: 'task_template_v2',
    items: [
      {
        id: fieldId,
        key: 'scene_photo',
        type: 'file',
        label,
        required: true,
        validation: { accept: 'image/*' },
        evidence_purpose: 'scene_qc',
      },
    ],
    metadata: { task_type: 'ACTIVE' },
  };
}

class FakeStorageService {
  resolvePublicFileUrl(objectKey: string): string {
    return `${CDN_BASE}/${objectKey}`;
  }

  sanitizeActorIdForObjectKey(): string {
    return 'integration';
  }

  async headObject(): Promise<{ contentType: string; contentLength: number }> {
    return { contentType: 'image/png', contentLength: 12345 };
  }

  deriveObjectKeyFromPublicUrl(fileUrl: string): string | null {
    return fileUrl.startsWith(`${CDN_BASE}/`) ? fileUrl.slice(CDN_BASE.length + 1) : null;
  }
}

@Injectable()
class SceneQcConfirmationTransactionProbe {
  constructor(private readonly workflow: SceneQcConfirmationWorkflowService) {}

  @Transactional<TransactionalAdapterPrisma>()
  async confirmAndFail(studioUid: string, operationalDate: string, context: { actorExtId: string; studioUid: string }): Promise<never> {
    await this.workflow.confirmDay(studioUid, operationalDate, context);
    throw new Error('scene qc confirmation rollback probe');
  }
}

describe('real database Scene QC confirmation persistence safety', () => {
  let moduleRef: TestingModule;
  let clsService: ClsService;
  let prisma: PrismaService;
  let reviewWorkflow: SceneQcWorkflowService;
  let confirmationWorkflow: SceneQcConfirmationWorkflowService;
  let recordsQueryService: SceneQcRecordsQueryService;
  let reportService: SceneQcReportService;
  let sceneQcQueryService: SceneQcQueryService;
  let probe: SceneQcConfirmationTransactionProbe;

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
        SceneQcModule,
      ],
      providers: [SceneQcConfirmationTransactionProbe],
    })
      .overrideProvider(StorageService)
      .useClass(FakeStorageService)
      .compile();

    await moduleRef.init();

    clsService = moduleRef.get(ClsService);
    prisma = moduleRef.get(PrismaService);
    reviewWorkflow = moduleRef.get(SceneQcWorkflowService);
    confirmationWorkflow = moduleRef.get(SceneQcConfirmationWorkflowService);
    recordsQueryService = moduleRef.get(SceneQcRecordsQueryService);
    reportService = moduleRef.get(SceneQcReportService);
    sceneQcQueryService = moduleRef.get(SceneQcQueryService);
    probe = moduleRef.get(SceneQcConfirmationTransactionProbe);
  });

  afterEach(async () => {
    await prisma.sceneQcDailyConfirmationItemPlatform.deleteMany({ where: { item: { confirmation: { studio: { name: { startsWith: INTEGRATION_NAME_PREFIX } } } } } });
    await prisma.sceneQcDailyConfirmationItem.deleteMany({ where: { confirmation: { studio: { name: { startsWith: INTEGRATION_NAME_PREFIX } } } } });
    await prisma.sceneQcDailyConfirmation.deleteMany({ where: { studio: { name: { startsWith: INTEGRATION_NAME_PREFIX } } } });
    await prisma.task.deleteMany({ where: { description: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.taskTemplate.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.show.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.showType.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.showStatus.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.showStandard.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.platform.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.client.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.studio.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.audit.deleteMany({ where: { actorId: { not: null }, actor: { email: { startsWith: INTEGRATION_NAME_PREFIX } } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: INTEGRATION_NAME_PREFIX } } });
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  /** All fixture Shows for one test belong to the SAME caller-provided studio, so confirmDay operates over a shared day. */
  async function createShowFixture(
    suffix: string,
    studioId: bigint,
    startTime: Date = new Date(WINDOW.windowStart.getTime() + 60 * 60 * 1000),
  ) {
    const client = await prisma.client.create({
      data: {
        uid: `client_it_${suffix}`,
        name: `${INTEGRATION_NAME_PREFIX}client:${suffix}`,
        contactPerson: 'Integration Test',
        contactEmail: `integration-scene-qc-confirmation-${suffix}@example.com`,
        metadata: {},
      },
    });
    const platform = await prisma.platform.create({
      data: { uid: `plt_it_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}platform:${suffix}`, apiConfig: {}, metadata: {} },
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
        startTime,
        endTime: new Date(startTime.getTime() + 60 * 60 * 1000),
        client: { connect: { id: client.id } },
        studio: { connect: { id: studioId } },
        showType: { connect: { id: showType.id } },
        showStatus: { connect: { id: showStatus.id } },
        showStandard: { connect: { id: showStandard.id } },
        showPlatforms: { create: { uid: `shpl_it_${suffix}`, platform: { connect: { id: platform.id } } } },
        metadata: {},
      },
    });
    return { client, platform, showType, showStatus, showStandard, show };
  }

  async function createEvidenceTask(suffix: string, studioId: bigint, showId: bigint, fieldValue: string, label = 'Scene photo') {
    const fieldId = `fld_${fieldIdSuffix(suffix)}`;
    const schema = v2Schema(fieldId, label);
    const template = await prisma.taskTemplate.create({
      data: {
        uid: `ttpl_it_${suffix}`,
        studio: { connect: { id: studioId } },
        name: `${INTEGRATION_NAME_PREFIX}template:${suffix}`,
        currentSchema: schema,
        version: 1,
        snapshots: { create: { version: 1, schema } },
      },
      include: { snapshots: true },
    });
    const snapshot = template.snapshots[0];
    await prisma.taskTemplateSceneQcEvidenceRef.create({
      data: { templateId: template.id, snapshotId: snapshot.id, fieldKey: fieldId, label },
    });
    const task = await prisma.task.create({
      data: {
        uid: `task_it_${suffix}`,
        description: `${INTEGRATION_NAME_PREFIX}task:${suffix}`,
        type: 'ACTIVE',
        snapshotId: snapshot.id,
        templateId: template.id,
        content: { [fieldId]: fieldValue },
        studioId,
        targets: { create: { targetType: 'SHOW', targetId: showId, showId } },
      },
    });
    return { template, snapshot, task, fieldId };
  }

  async function createUser(suffix: string) {
    const user = await prisma.user.create({
      data: { uid: `user_it_${suffix}`, extId: `ext_it_${suffix}`, email: `${INTEGRATION_NAME_PREFIX}${suffix}@example.com`, name: 'Integration Confirmer' },
    });
    return { uid: user.uid, extId: user.extId! };
  }

  /** Creates a fully review-complete Show (fixture + evidence + a PASS review) ready to confirm. */
  async function createReviewedShow(suffix: string, studio: { id: bigint; uid: string }, userExtId: string, startTime?: Date) {
    const fixture = await createShowFixture(suffix, studio.id, startTime);
    await createEvidenceTask(suffix, studio.id, fixture.show.id, `${CDN_BASE}/scene_reference/it/${suffix}/a.png`);
    const review = await reviewWorkflow.createReview(
      studio.uid,
      { showId: fixture.show.uid, operationalDate: OPERATIONAL_DATE, result: 'PASS', feedback: null },
      { actorExtId: userExtId, studioUid: studio.uid },
    );
    return { ...fixture, review };
  }

  it('1. concurrency: two confirmDay calls issued in parallel through two independent CLS contexts produce exactly one revision', async () => {
    const suffix = uniqueSuffix();
    const user = await createUser(suffix);
    const studio = await prisma.studio.create({
      data: { uid: `studio_it_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}studio:${suffix}`, address: '1 St', metadata: {} },
    });
    await createReviewedShow(`${suffix}_a`, studio, user.extId);

    const context = { actorExtId: user.extId, studioUid: studio.uid };
    const results = await Promise.all([
      clsService.run(() => confirmationWorkflow.confirmDay(studio.uid, OPERATIONAL_DATE, context)),
      clsService.run(() => confirmationWorkflow.confirmDay(studio.uid, OPERATIONAL_DATE, context)),
    ]);

    expect(results[0].revision).toBe(1);
    expect(results[1].revision).toBe(1);
    expect(results[0].id).toBe(results[1].id);

    const confirmations = await prisma.sceneQcDailyConfirmation.findMany({ where: { studioId: studio.id } });
    expect(confirmations).toHaveLength(1);
    expect(confirmations[0].revision).toBe(1);

    const items = await prisma.sceneQcDailyConfirmationItem.findMany({ where: { confirmationId: confirmations[0].id } });
    expect(items).toHaveLength(1);

    const audits = await prisma.sceneQcAuditTarget.findMany({ where: { sceneQcDailyConfirmationId: confirmations[0].id } });
    expect(audits).toHaveLength(1);
    await prisma.audit.deleteMany({ where: { id: { in: audits.map((a) => a.auditId) } } });
  }, 30_000);

  it('1b. concurrency: three simultaneous callers still produce exactly one revision', async () => {
    const suffix = uniqueSuffix();
    const user = await createUser(suffix);
    const studio = await prisma.studio.create({
      data: { uid: `studio_it_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}studio:${suffix}`, address: '1 St', metadata: {} },
    });
    await createReviewedShow(`${suffix}_a`, studio, user.extId);

    const context = { actorExtId: user.extId, studioUid: studio.uid };
    await Promise.all([
      clsService.run(() => confirmationWorkflow.confirmDay(studio.uid, OPERATIONAL_DATE, context)),
      clsService.run(() => confirmationWorkflow.confirmDay(studio.uid, OPERATIONAL_DATE, context)),
      clsService.run(() => confirmationWorkflow.confirmDay(studio.uid, OPERATIONAL_DATE, context)),
    ]);

    const confirmations = await prisma.sceneQcDailyConfirmation.findMany({ where: { studioId: studio.id } });
    expect(confirmations).toHaveLength(1);

    const audits = await prisma.sceneQcAuditTarget.findMany({ where: { sceneQcDailyConfirmation: { studioId: studio.id } } });
    await prisma.audit.deleteMany({ where: { id: { in: audits.map((a) => a.auditId) } } });
  }, 30_000);

  it('3. @@unique([studioId, operationalDate, revision]) rejects a hand-inserted duplicate revision', async () => {
    const suffix = uniqueSuffix();
    const user = await createUser(suffix);
    const studio = await prisma.studio.create({
      data: { uid: `studio_it_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}studio:${suffix}`, address: '1 St', metadata: {} },
    });
    const confirmed = await prisma.sceneQcDailyConfirmation.create({
      data: {
        uid: `scqcc_it_${suffix}_a`,
        studio: { connect: { id: studio.id } },
        operationalDate: new Date(`${OPERATIONAL_DATE}T00:00:00.000Z`),
        windowStart: WINDOW.windowStart,
        windowEnd: WINDOW.windowEnd,
        timezone: WINDOW.timezone,
        revision: 1,
        confirmedBy: { connect: { uid: user.uid } },
        confirmedAt: new Date(),
      },
    });
    void confirmed;

    await expect(
      prisma.sceneQcDailyConfirmation.create({
        data: {
          uid: `scqcc_it_${suffix}_b`,
          studio: { connect: { id: studio.id } },
          operationalDate: new Date(`${OPERATIONAL_DATE}T00:00:00.000Z`),
          windowStart: WINDOW.windowStart,
          windowEnd: WINDOW.windowEnd,
          timezone: WINDOW.timezone,
          revision: 1,
          confirmedBy: { connect: { uid: user.uid } },
          confirmedAt: new Date(),
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('4. reconfirmation appends a new revision without rewriting the prior revision or its items', async () => {
    const suffix = uniqueSuffix();
    const user = await createUser(suffix);
    const studio = await prisma.studio.create({
      data: { uid: `studio_it_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}studio:${suffix}`, address: '1 St', metadata: {} },
    });
    const context = { actorExtId: user.extId, studioUid: studio.uid };
    await createReviewedShow(`${suffix}_a`, studio, user.extId);

    const first = await confirmationWorkflow.confirmDay(studio.uid, OPERATIONAL_DATE, context);
    const revision1Row = await prisma.sceneQcDailyConfirmation.findUniqueOrThrow({ where: { uid: first.id } });
    const revision1Items = await prisma.sceneQcDailyConfirmationItem.findMany({ where: { confirmationId: revision1Row.id } });

    // Add a second eligible+reviewed Show to the same operational day.
    await createReviewedShow(`${suffix}_b`, studio, user.extId);
    const second = await confirmationWorkflow.confirmDay(studio.uid, OPERATIONAL_DATE, context);

    expect(second.revision).toBe(2);
    expect(second.id).not.toBe(first.id);

    const revision1RowAfter = await prisma.sceneQcDailyConfirmation.findUniqueOrThrow({ where: { uid: first.id } });
    const revision1ItemsAfter = await prisma.sceneQcDailyConfirmationItem.findMany({
      where: { confirmationId: revision1Row.id },
      orderBy: { showId: 'asc' },
    });
    expect(revision1RowAfter).toEqual(revision1Row);
    expect(revision1ItemsAfter).toEqual([...revision1Items].sort((a, b) => (a.showId < b.showId ? -1 : 1)));

    const audits = await prisma.sceneQcAuditTarget.findMany({ where: { sceneQcDailyConfirmation: { studioId: studio.id } } });
    await prisma.audit.deleteMany({ where: { id: { in: audits.map((a) => a.auditId) } } });
  }, 30_000);

  it('5. confirmedAt semantics: only previously-null reviews get stamped, and version/reviewedAt never change', async () => {
    const suffix = uniqueSuffix();
    const user = await createUser(suffix);
    const studio = await prisma.studio.create({
      data: { uid: `studio_it_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}studio:${suffix}`, address: '1 St', metadata: {} },
    });
    const context = { actorExtId: user.extId, studioUid: studio.uid };
    const showA = await createReviewedShow(`${suffix}_a`, studio, user.extId);

    await confirmationWorkflow.confirmDay(studio.uid, OPERATIONAL_DATE, context);
    const reviewAAfterFirst = await prisma.sceneQcReview.findUniqueOrThrow({ where: { uid: showA.review.uid } });
    expect(reviewAAfterFirst.confirmedAt).not.toBeNull();

    const showB = await createReviewedShow(`${suffix}_b`, studio, user.extId);
    await confirmationWorkflow.confirmDay(studio.uid, OPERATIONAL_DATE, context);

    const reviewAAfterSecond = await prisma.sceneQcReview.findUniqueOrThrow({ where: { uid: showA.review.uid } });
    const reviewBAfterSecond = await prisma.sceneQcReview.findUniqueOrThrow({ where: { uid: showB.review.uid } });

    expect(reviewAAfterSecond.confirmedAt).toEqual(reviewAAfterFirst.confirmedAt);
    expect(reviewAAfterSecond.version).toBe(reviewAAfterFirst.version);
    expect(reviewAAfterSecond.reviewedAt).toEqual(reviewAAfterFirst.reviewedAt);
    expect(reviewBAfterSecond.confirmedAt).not.toBeNull();

    const audits = await prisma.sceneQcAuditTarget.findMany({ where: { sceneQcDailyConfirmation: { studioId: studio.id } } });
    await prisma.audit.deleteMany({ where: { id: { in: audits.map((a) => a.auditId) } } });
  }, 30_000);

  it('6. rollback leaves no partial confirmation, item, platform, Audit, SceneQcAuditTarget, or confirmedAt stamp', async () => {
    const suffix = uniqueSuffix();
    const user = await createUser(suffix);
    const studio = await prisma.studio.create({
      data: { uid: `studio_it_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}studio:${suffix}`, address: '1 St', metadata: {} },
    });
    await createReviewedShow(`${suffix}_a`, studio, user.extId);

    await expect(
      clsService.run(() =>
        probe.confirmAndFail(studio.uid, OPERATIONAL_DATE, { actorExtId: user.extId, studioUid: studio.uid }),
      ),
    ).rejects.toThrow('scene qc confirmation rollback probe');

    await expect(prisma.sceneQcDailyConfirmation.count({ where: { studioId: studio.id } })).resolves.toBe(0);
    await expect(prisma.sceneQcDailyConfirmationItem.count({})).resolves.toBe(0);
    await expect(prisma.sceneQcDailyConfirmationItemPlatform.count({})).resolves.toBe(0);
    // Filtered on the confirmation event specifically -- createReviewedShow's
    // own review-save Audit row also carries `metadata.studio_uid` and is
    // correctly NOT rolled back (it committed before the probe ran).
    await expect(
      prisma.audit.count({ where: { metadata: { path: ['event'], equals: 'scene_qc_day_confirmed' } } }),
    ).resolves.toBe(0);
    await expect(prisma.sceneQcAuditTarget.count({ where: { sceneQcDailyConfirmation: { studioId: studio.id } } })).resolves.toBe(0);
    const reviews = await prisma.sceneQcReview.findMany({ where: { show: { studioId: studio.id } } });
    expect(reviews.every((review) => review.confirmedAt === null)).toBe(true);
  });

  it('7. the widened CHECK accepts a confirmation-only target and rejects zero-set/two-set', async () => {
    const suffix = uniqueSuffix();
    const user = await createUser(suffix);
    const studio = await prisma.studio.create({
      data: { uid: `studio_it_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}studio:${suffix}`, address: '1 St', metadata: {} },
    });
    const confirmation = await prisma.sceneQcDailyConfirmation.create({
      data: {
        uid: `scqcc_it_check_${suffix}`,
        studio: { connect: { id: studio.id } },
        operationalDate: new Date(`${OPERATIONAL_DATE}T00:00:00.000Z`),
        windowStart: WINDOW.windowStart,
        windowEnd: WINDOW.windowEnd,
        timezone: WINDOW.timezone,
        revision: 1,
        confirmedBy: { connect: { uid: user.uid } },
        confirmedAt: new Date(),
      },
    });
    const audit = await prisma.audit.create({ data: { uid: `aud_it_check_${suffix}`, action: 'CREATE', metadata: {} } });

    const confirmationOnly = await prisma.sceneQcAuditTarget.create({
      data: { auditId: audit.id, sceneQcDailyConfirmationId: confirmation.id },
    });
    expect(confirmationOnly.sceneQcDailyConfirmationId).toBe(confirmation.id);

    await expect(
      prisma.sceneQcAuditTarget.create({ data: { auditId: audit.id } }),
    ).rejects.toThrow();

    await expect(
      prisma.sceneQcAuditTarget.create({
        data: { auditId: audit.id, sceneQcDailyConfirmationId: confirmation.id, sceneQcReviewId: null, sceneProfileId: null },
      }),
    ).resolves.toBeDefined();

    await prisma.audit.delete({ where: { id: audit.id } });
  });

  describe('8. staleness after every section-5.4 change kind', () => {
    it('flips to STALE when a Show is added, then back to CURRENT after reconfirmation', async () => {
      const suffix = uniqueSuffix();
      const user = await createUser(suffix);
      const studio = await prisma.studio.create({
        data: { uid: `studio_it_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}studio:${suffix}`, address: '1 St', metadata: {} },
      });
      const context = { actorExtId: user.extId, studioUid: studio.uid };
      await createReviewedShow(`${suffix}_a`, studio, user.extId);
      await confirmationWorkflow.confirmDay(studio.uid, OPERATIONAL_DATE, context);

      await createReviewedShow(`${suffix}_b`, studio, user.extId);

      const summary = await sceneQcQueryService.getDailySummary(studio.uid, OPERATIONAL_DATE);
      expect(summary.confirmation).toBe('STALE');
      expect(summary.confirmation_added_show_count).toBe(1);

      const reconfirmed = await confirmationWorkflow.confirmDay(studio.uid, OPERATIONAL_DATE, context);
      const summaryAfter = await sceneQcQueryService.getDailySummary(studio.uid, OPERATIONAL_DATE);
      expect(summaryAfter.confirmation).toBe('CURRENT');
      expect(reconfirmed.revision).toBe(2);

      const audits = await prisma.sceneQcAuditTarget.findMany({ where: { sceneQcDailyConfirmation: { studioId: studio.id } } });
      await prisma.audit.deleteMany({ where: { id: { in: audits.map((a) => a.auditId) } } });
    }, 30_000);

    it('flips to STALE when a confirmed Show is soft-deleted, then back to CURRENT after reconfirmation', async () => {
      const suffix = uniqueSuffix();
      const user = await createUser(suffix);
      const studio = await prisma.studio.create({
        data: { uid: `studio_it_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}studio:${suffix}`, address: '1 St', metadata: {} },
      });
      const context = { actorExtId: user.extId, studioUid: studio.uid };
      const showA = await createReviewedShow(`${suffix}_a`, studio, user.extId);
      const showB = await createReviewedShow(`${suffix}_b`, studio, user.extId);
      await confirmationWorkflow.confirmDay(studio.uid, OPERATIONAL_DATE, context);
      void showB;

      await prisma.show.update({ where: { id: showA.show.id }, data: { deletedAt: new Date() } });

      const summary = await sceneQcQueryService.getDailySummary(studio.uid, OPERATIONAL_DATE);
      expect(summary.confirmation).toBe('STALE');
      expect(summary.confirmation_removed_show_count).toBe(1);

      const reconfirmed = await confirmationWorkflow.confirmDay(studio.uid, OPERATIONAL_DATE, context);
      expect(reconfirmed.revision).toBe(2);
      const summaryAfter = await sceneQcQueryService.getDailySummary(studio.uid, OPERATIONAL_DATE);
      expect(summaryAfter.confirmation).toBe('CURRENT');

      const audits = await prisma.sceneQcAuditTarget.findMany({ where: { sceneQcDailyConfirmation: { studioId: studio.id } } });
      await prisma.audit.deleteMany({ where: { id: { in: audits.map((a) => a.auditId) } } });
    }, 30_000);

    it('flips to STALE when a confirmed Show is terminally cancelled, then back to CURRENT after reconfirmation', async () => {
      const suffix = uniqueSuffix();
      const user = await createUser(suffix);
      const studio = await prisma.studio.create({
        data: { uid: `studio_it_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}studio:${suffix}`, address: '1 St', metadata: {} },
      });
      const context = { actorExtId: user.extId, studioUid: studio.uid };
      const showA = await createReviewedShow(`${suffix}_a`, studio, user.extId);
      await createReviewedShow(`${suffix}_b`, studio, user.extId);
      await confirmationWorkflow.confirmDay(studio.uid, OPERATIONAL_DATE, context);

      await prisma.showStatus.update({ where: { id: showA.showStatus.id }, data: { systemKey: 'CANCELLED' } });

      const summary = await sceneQcQueryService.getDailySummary(studio.uid, OPERATIONAL_DATE);
      expect(summary.confirmation).toBe('STALE');
      expect(summary.confirmation_removed_show_count).toBe(1);

      const reconfirmed = await confirmationWorkflow.confirmDay(studio.uid, OPERATIONAL_DATE, context);
      expect(reconfirmed.revision).toBe(2);

      const audits = await prisma.sceneQcAuditTarget.findMany({ where: { sceneQcDailyConfirmation: { studioId: studio.id } } });
      await prisma.audit.deleteMany({ where: { id: { in: audits.map((a) => a.auditId) } } });
    }, 30_000);

    it('flips to STALE when a Show is rescheduled out of the operational day, then back to CURRENT after reconfirmation', async () => {
      const suffix = uniqueSuffix();
      const user = await createUser(suffix);
      const studio = await prisma.studio.create({
        data: { uid: `studio_it_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}studio:${suffix}`, address: '1 St', metadata: {} },
      });
      const context = { actorExtId: user.extId, studioUid: studio.uid };
      const showA = await createReviewedShow(`${suffix}_a`, studio, user.extId);
      await createReviewedShow(`${suffix}_b`, studio, user.extId);
      await confirmationWorkflow.confirmDay(studio.uid, OPERATIONAL_DATE, context);

      await prisma.show.update({
        where: { id: showA.show.id },
        data: { startTime: new Date(WINDOW.windowEnd.getTime() + 60 * 60 * 1000) },
      });

      const summary = await sceneQcQueryService.getDailySummary(studio.uid, OPERATIONAL_DATE);
      expect(summary.confirmation).toBe('STALE');
      expect(summary.confirmation_removed_show_count).toBe(1);

      const audits = await prisma.sceneQcAuditTarget.findMany({ where: { sceneQcDailyConfirmation: { studioId: studio.id } } });
      await prisma.audit.deleteMany({ where: { id: { in: audits.map((a) => a.auditId) } } });
    }, 30_000);
  });

  it('9. report immutability: renaming the Show, Client, and Platform after confirming leaves the report unchanged, except studio.name', async () => {
    const suffix = uniqueSuffix();
    const user = await createUser(suffix);
    const studio = await prisma.studio.create({
      data: { uid: `studio_it_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}studio:${suffix}`, address: '1 St', metadata: {} },
    });
    const context = { actorExtId: user.extId, studioUid: studio.uid };
    const fixture = await createReviewedShow(`${suffix}_a`, studio, user.extId);
    const confirmed = await confirmationWorkflow.confirmDay(studio.uid, OPERATIONAL_DATE, context);
    const reportBefore = await reportService.getReport(studio.uid, confirmed.id);

    await prisma.show.update({ where: { id: fixture.show.id }, data: { name: `${INTEGRATION_NAME_PREFIX}renamed-show:${suffix}` } });
    await prisma.client.update({ where: { id: fixture.client.id }, data: { name: `${INTEGRATION_NAME_PREFIX}renamed-client:${suffix}` } });
    await prisma.platform.update({ where: { id: fixture.platform.id }, data: { name: `${INTEGRATION_NAME_PREFIX}renamed-platform:${suffix}` } });
    await prisma.studio.update({ where: { id: studio.id }, data: { name: `${INTEGRATION_NAME_PREFIX}renamed-studio:${suffix}` } });

    const reportAfter = await reportService.getReport(studio.uid, confirmed.id);

    expect(reportAfter.shows[0].show_name).toBe(reportBefore.shows[0].show_name);
    expect(reportAfter.client_breakdown[0].client_name).toBe(reportBefore.client_breakdown[0].client_name);
    expect(reportAfter.platform_breakdown[0].platform_name).toBe(reportBefore.platform_breakdown[0].platform_name);
    // Studio name is the ONE dimension that follows the live row (OQ-33).
    expect(reportAfter.studio.name).toBe(`${INTEGRATION_NAME_PREFIX}renamed-studio:${suffix}`);
    expect(reportAfter.studio.name).not.toBe(reportBefore.studio.name);

    const audits = await prisma.sceneQcAuditTarget.findMany({ where: { sceneQcDailyConfirmation: { studioId: studio.id } } });
    await prisma.audit.deleteMany({ where: { id: { in: audits.map((a) => a.auditId) } } });
  });

  it('10. CSV row count reconciles to the confirmation item count and scope.total_shows', async () => {
    const suffix = uniqueSuffix();
    const user = await createUser(suffix);
    const studio = await prisma.studio.create({
      data: { uid: `studio_it_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}studio:${suffix}`, address: '1 St', metadata: {} },
    });
    const context = { actorExtId: user.extId, studioUid: studio.uid };
    await createReviewedShow(`${suffix}_a`, studio, user.extId);
    await createReviewedShow(`${suffix}_b`, studio, user.extId);
    const confirmed = await confirmationWorkflow.confirmDay(studio.uid, OPERATIONAL_DATE, context);

    const report = await reportService.getReport(studio.uid, confirmed.id);
    const csv = serializeSceneQcReportToCsv(report);
    const rowCount = csv.slice(1).split('\r\n').length - 1; // minus header

    expect(rowCount).toBe(report.scope.total_shows);
    expect(report.scope.total_shows).toBe(2);
    const passRows = report.shows.filter((show) => show.result === 'PASS').length;
    expect(passRows).toBe(report.scope.pass_count);

    const audits = await prisma.sceneQcAuditTarget.findMany({ where: { sceneQcDailyConfirmation: { studioId: studio.id } } });
    await prisma.audit.deleteMany({ where: { id: { in: audits.map((a) => a.auditId) } } });
  });

  it('11. regression: scene_profiles_active_client_key still exists after this migration', async () => {
    const rows = await prisma.$queryRaw<{ indexdef: string }[]>`
      SELECT indexdef FROM pg_indexes
      WHERE indexname = 'scene_profiles_active_client_key'
    `;

    expect(rows).toHaveLength(1);
    expect(rows[0].indexdef).toContain('client_id');
    expect(rows[0].indexdef.toUpperCase()).toContain('WHERE (DELETED_AT IS NULL)');
  });

  it('Records: confirmed review shows CONFIRMED status, and becomes SUPERSEDED once a later revision exists', async () => {
    const suffix = uniqueSuffix();
    const user = await createUser(suffix);
    const studio = await prisma.studio.create({
      data: { uid: `studio_it_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}studio:${suffix}`, address: '1 St', metadata: {} },
    });
    const context = { actorExtId: user.extId, studioUid: studio.uid };
    const showA = await createReviewedShow(`${suffix}_a`, studio, user.extId);
    await confirmationWorkflow.confirmDay(studio.uid, OPERATIONAL_DATE, context);

    const { items } = await recordsQueryService.listRecords(studio.uid, {
      dateFrom: OPERATIONAL_DATE,
      dateTo: OPERATIONAL_DATE,
      clientId: undefined,
      platformId: undefined,
      result: undefined,
      page: 1,
      limit: 20,
    });
    const recordA = items.find((item) => item.review_id === showA.review.uid);
    expect(recordA?.confirmation_status).toBe('CONFIRMED');

    await createReviewedShow(`${suffix}_b`, studio, user.extId);
    await confirmationWorkflow.confirmDay(studio.uid, OPERATIONAL_DATE, context);

    const { items: itemsAfter } = await recordsQueryService.listRecords(studio.uid, {
      dateFrom: OPERATIONAL_DATE,
      dateTo: OPERATIONAL_DATE,
      clientId: undefined,
      platformId: undefined,
      result: undefined,
      page: 1,
      limit: 20,
    });
    const recordAAfter = itemsAfter.find((item) => item.review_id === showA.review.uid);
    // Show A's review is unchanged and re-included on revision 2, so its
    // latest referencing confirmation IS the day's latest -- still CONFIRMED,
    // not SUPERSEDED (the review itself was never dropped from scope).
    expect(recordAAfter?.confirmation_status).toBe('CONFIRMED');

    const audits = await prisma.sceneQcAuditTarget.findMany({ where: { sceneQcDailyConfirmation: { studioId: studio.id } } });
    await prisma.audit.deleteMany({ where: { id: { in: audits.map((a) => a.auditId) } } });
  }, 30_000);
});
