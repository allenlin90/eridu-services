import 'reflect-metadata';

import { ConfigModule } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';

import { SCENE_QC_REVIEW_STATE } from '@eridu/api-types/scene-qc';

import { SceneProfileService } from '@/capabilities/scene-qc/scene-profile.service';
import { SceneQcModule } from '@/capabilities/scene-qc/scene-qc.module';
import { SceneQcAmendmentService } from '@/capabilities/scene-qc/scene-qc-amendment.service';
import { SceneQcConfirmationWorkflowService } from '@/capabilities/scene-qc/scene-qc-confirmation-workflow.service';
import { OPERATIONAL_TIMEZONE, resolveOperationalWindow } from '@/capabilities/scene-qc/scene-qc-operational-window.util';
import { SceneQcPeriodReportService } from '@/capabilities/scene-qc/scene-qc-period-report.service';
import { SceneQcQueryService } from '@/capabilities/scene-qc/scene-qc-query.service';
import { SceneQcRecordsQueryService } from '@/capabilities/scene-qc/scene-qc-records.query.service';
import { SceneQcReportService } from '@/capabilities/scene-qc/scene-qc-report.service';
import { serializeSceneQcReportToCsv } from '@/capabilities/scene-qc/scene-qc-report-csv';
import { SceneQcWorkflowService } from '@/capabilities/scene-qc/scene-qc-review-workflow.service';
import { StorageService } from '@/lib/storage/storage.service';
import { TaskTemplateModule } from '@/models/task-template/task-template.module';
import { TaskTemplateService } from '@/models/task-template/task-template.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Whole-capability journey: a Client Scene Profile, a Task Template snapshot
 * bound to Scene QC evidence through the REAL backfill path, two eligible
 * Shows in one operational day (one multi-image, one single-image), one PASS
 * and one MINOR review, one confirmation, and the report/CSV/Records reads
 * that must all agree afterward.
 *
 * Every prior Scene QC integration spec builds its own narrow fixture and
 * proves one workflow in isolation. Nothing before this test proves that a
 * profile saved through SceneProfileService, evidence bound through the real
 * TaskTemplateService.updateTemplateWithSnapshot (the same path
 * scripts/backfill-scene-qc-evidence-refs.ts drives), a review saved through
 * SceneQcWorkflowService, and a confirmation appended through
 * SceneQcConfirmationWorkflowService compose into a report and CSV that
 * agree. See apps/erify_api/docs/SCENE_QC.md.
 */
const INTEGRATION_NAME_PREFIX = 'integration-scene-qc-journey:';
const CDN_BASE = 'https://cdn.example.com';
const OPERATIONAL_DATE = '2026-08-01';
const WINDOW = resolveOperationalWindow(OPERATIONAL_DATE, OPERATIONAL_TIMEZONE);

function uniqueSuffix(): string {
  return `${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

function fieldIdSuffix(suffix: string): string {
  return suffix.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function bareSchema() {
  return {
    schema_version: 2,
    schema_engine: 'task_template_v2',
    items: [
      {
        id: 'fld_placeholder0000',
        key: 'scene_photo',
        type: 'file',
        label: 'Scene photo',
        required: true,
        validation: { accept: 'image/*' },
      },
    ],
    metadata: { task_type: 'ACTIVE' },
  };
}

function evidenceSchema(fieldId: string) {
  return {
    schema_version: 2,
    schema_engine: 'task_template_v2',
    items: [
      {
        id: fieldId,
        key: 'scene_photo',
        type: 'file',
        label: 'Scene photo',
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

describe('real database Scene QC whole-capability journey', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let taskTemplateService: TaskTemplateService;
  let sceneProfileService: SceneProfileService;
  let amendmentService: SceneQcAmendmentService;
  let reviewWorkflow: SceneQcWorkflowService;
  let confirmationWorkflow: SceneQcConfirmationWorkflowService;
  let sceneQcQueryService: SceneQcQueryService;
  let recordsQueryService: SceneQcRecordsQueryService;
  let reportService: SceneQcReportService;
  let periodReportService: SceneQcPeriodReportService;

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
        TaskTemplateModule,
      ],
    })
      .overrideProvider(StorageService)
      .useClass(FakeStorageService)
      .compile();

    await moduleRef.init();

    prisma = moduleRef.get(PrismaService);
    taskTemplateService = moduleRef.get(TaskTemplateService);
    sceneProfileService = moduleRef.get(SceneProfileService);
    amendmentService = moduleRef.get(SceneQcAmendmentService);
    reviewWorkflow = moduleRef.get(SceneQcWorkflowService);
    confirmationWorkflow = moduleRef.get(SceneQcConfirmationWorkflowService);
    sceneQcQueryService = moduleRef.get(SceneQcQueryService);
    recordsQueryService = moduleRef.get(SceneQcRecordsQueryService);
    reportService = moduleRef.get(SceneQcReportService);
    periodReportService = moduleRef.get(SceneQcPeriodReportService);
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

  it('one operational day, one actor: profile save -> real evidence binding -> two reviews -> confirmation -> report/CSV/Records agree', async () => {
    const suffix = uniqueSuffix();
    const fieldId = `fld_${fieldIdSuffix(suffix)}`;

    // --- Fixture: studio, client, platform, show taxonomy, one operator ---
    const studio = await prisma.studio.create({
      data: { uid: `studio_it_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}studio:${suffix}`, address: '1 Journey St', metadata: {} },
    });
    const client = await prisma.client.create({
      data: {
        uid: `client_it_${suffix}`,
        name: `${INTEGRATION_NAME_PREFIX}client:${suffix}`,
        contactPerson: 'Integration Test',
        contactEmail: `integration-scene-qc-journey-${suffix}@example.com`,
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
    const user = await prisma.user.create({
      data: { uid: `user_it_${suffix}`, extId: `ext_it_${suffix}`, email: `${INTEGRATION_NAME_PREFIX}${suffix}@example.com`, name: 'Integration Journey Operator' },
    });
    const context = { actorExtId: user.extId!, studioUid: studio.uid };

    // --- Step 1: save a Client Scene Profile through SceneProfileService ---
    const profileObjectKey = `scene_reference/integration/${suffix}.png`;
    await sceneProfileService.saveProfileForClient(
      client.uid,
      {
        objectKey: profileObjectKey,
        fileUrl: `${CDN_BASE}/${profileObjectKey}`,
        mimeType: 'image/png',
        fileSize: 12345,
        sceneType: 'GRAPHIC_BG',
      },
      context,
    );

    // --- Step 2: publish a Task Template snapshot carrying evidence_purpose
    // through the REAL TaskTemplateService.updateTemplateWithSnapshot -- the
    // same path scripts/backfill-scene-qc-evidence-refs.ts drives, which no
    // other integration spec exercises inside a full journey. ---
    const template = await prisma.taskTemplate.create({
      data: {
        uid: `ttpl_it_${suffix}`,
        studio: { connect: { id: studio.id } },
        name: `${INTEGRATION_NAME_PREFIX}template:${suffix}`,
        currentSchema: bareSchema(),
        version: 1,
        snapshots: { create: { version: 1, schema: bareSchema() } },
      },
    });
    await taskTemplateService.updateTemplateWithSnapshot(template.uid, studio.uid, {
      version: 1,
      currentSchema: evidenceSchema(fieldId),
    });
    const boundSnapshot = await prisma.taskTemplateSnapshot.findFirstOrThrow({
      where: { templateId: template.id, version: 2 },
    });
    const evidenceRefs = await prisma.taskTemplateSceneQcEvidenceRef.findMany({
      where: { snapshotId: boundSnapshot.id },
    });
    expect(evidenceRefs).toHaveLength(1);
    expect(evidenceRefs[0].fieldKey).toBe(fieldId);

    // --- Step 3: two eligible Shows in the day -- one with two evidence
    // images from two different Tasks, one with one. ---
    const showA = await prisma.show.create({
      data: {
        uid: `show_it_a_${suffix}`,
        name: `${INTEGRATION_NAME_PREFIX}show-a:${suffix}`,
        startTime: new Date(WINDOW.windowStart.getTime() + 60 * 60 * 1000),
        endTime: new Date(WINDOW.windowStart.getTime() + 2 * 60 * 60 * 1000),
        client: { connect: { id: client.id } },
        studio: { connect: { id: studio.id } },
        showType: { connect: { id: showType.id } },
        showStatus: { connect: { id: showStatus.id } },
        showStandard: { connect: { id: showStandard.id } },
        showPlatforms: { create: { uid: `shpl_it_a_${suffix}`, platform: { connect: { id: platform.id } } } },
        metadata: {},
      },
    });
    const showB = await prisma.show.create({
      data: {
        uid: `show_it_b_${suffix}`,
        name: `${INTEGRATION_NAME_PREFIX}show-b:${suffix}`,
        startTime: new Date(WINDOW.windowStart.getTime() + 3 * 60 * 60 * 1000),
        endTime: new Date(WINDOW.windowStart.getTime() + 4 * 60 * 60 * 1000),
        client: { connect: { id: client.id } },
        studio: { connect: { id: studio.id } },
        showType: { connect: { id: showType.id } },
        showStatus: { connect: { id: showStatus.id } },
        showStandard: { connect: { id: showStandard.id } },
        showPlatforms: { create: { uid: `shpl_it_b_${suffix}`, platform: { connect: { id: platform.id } } } },
        metadata: {},
      },
    });

    await prisma.task.create({
      data: {
        uid: `task_it_a1_${suffix}`,
        description: `${INTEGRATION_NAME_PREFIX}task-a1:${suffix}`,
        type: 'ACTIVE',
        snapshotId: boundSnapshot.id,
        templateId: template.id,
        content: { [fieldId]: `${CDN_BASE}/scene_reference/it/${suffix}/a1.png` },
        studioId: studio.id,
        targets: { create: { targetType: 'SHOW', targetId: showA.id, showId: showA.id } },
      },
    });
    await prisma.task.create({
      data: {
        uid: `task_it_a2_${suffix}`,
        description: `${INTEGRATION_NAME_PREFIX}task-a2:${suffix}`,
        type: 'ACTIVE',
        snapshotId: boundSnapshot.id,
        templateId: template.id,
        content: { [fieldId]: `${CDN_BASE}/scene_reference/it/${suffix}/a2.png` },
        studioId: studio.id,
        targets: { create: { targetType: 'SHOW', targetId: showA.id, showId: showA.id } },
      },
    });
    await prisma.task.create({
      data: {
        uid: `task_it_b1_${suffix}`,
        description: `${INTEGRATION_NAME_PREFIX}task-b1:${suffix}`,
        type: 'ACTIVE',
        snapshotId: boundSnapshot.id,
        templateId: template.id,
        content: { [fieldId]: `${CDN_BASE}/scene_reference/it/${suffix}/b1.png` },
        studioId: studio.id,
        targets: { create: { targetType: 'SHOW', targetId: showB.id, showId: showB.id } },
      },
    });

    // --- Step 4: getDailySummary reports the unreviewed, unblocked scope ---
    const summaryBefore = await sceneQcQueryService.getDailySummary(studio.uid, OPERATIONAL_DATE);
    expect(summaryBefore.eligible_count).toBe(2);
    expect(summaryBefore.reviewed_count).toBe(0);
    expect(summaryBefore.blocked_no_evidence_count).toBe(0);
    expect(summaryBefore.confirmation).toBe('UNCONFIRMED');

    // --- Step 5: save one PASS (Show B) and one MINOR with feedback (Show A) ---
    const reviewB = await reviewWorkflow.createReview(
      studio.uid,
      { showId: showB.uid, operationalDate: OPERATIONAL_DATE, result: 'PASS', feedback: null },
      context,
    );
    const reviewA = await reviewWorkflow.createReview(
      studio.uid,
      {
        showId: showA.uid,
        operationalDate: OPERATIONAL_DATE,
        result: 'MINOR',
        feedback: 'Backdrop is slightly misaligned.',
        findings: [{
          element_id: 'scqce_system_bg',
          defect_id: 'scqcd_system_bg_misaligned',
        }],
      },
      context,
    );
    expect(reviewA.evidence).toHaveLength(2);
    expect(reviewB.evidence).toHaveLength(1);

    const { items: dailyItems } = await sceneQcQueryService.listDailyItems(studio.uid, {
      operationalDate: OPERATIONAL_DATE,
      clientId: undefined,
      platformId: undefined,
      reviewState: SCENE_QC_REVIEW_STATE.ALL,
      search: undefined,
      page: 1,
      limit: 20,
    });
    const showAItem = dailyItems.find((item) => item.show_id === showA.uid);
    expect(showAItem?.evidence_count).toBe(2);
    expect(showAItem?.result).toBe('MINOR');
    expect(dailyItems).toHaveLength(2);

    // --- Step 6: confirmDay ---
    const confirmed = await confirmationWorkflow.confirmDay(studio.uid, OPERATIONAL_DATE, context);
    expect(confirmed.revision).toBe(1);

    const reviewARow = await prisma.sceneQcReview.findUniqueOrThrow({ where: { uid: reviewA.uid } });
    const reviewBRow = await prisma.sceneQcReview.findUniqueOrThrow({ where: { uid: reviewB.uid } });
    expect(reviewARow.confirmedAt).not.toBeNull();
    expect(reviewBRow.confirmedAt).not.toBeNull();

    const summaryAfter = await sceneQcQueryService.getDailySummary(studio.uid, OPERATIONAL_DATE);
    expect(summaryAfter.confirmation).toBe('CURRENT');

    // --- Step 7: report + CSV agree ---
    const report = await reportService.getReport(studio.uid, confirmed.id);
    expect(report.scope.total_shows).toBe(2);
    expect(report.scope.pass_count).toBe(1);
    expect(report.scope.minor_count).toBe(1);
    expect(report.scope.fail_count).toBe(0);

    const csv = serializeSceneQcReportToCsv(report);
    const csvRowCount = csv.trimEnd().split('\r\n').length - 1; // minus header
    expect(csvRowCount).toBe(report.scope.total_shows);

    expect(report.exceptions).toHaveLength(1);
    expect(report.exceptions[0].show_id).toBe(showA.uid);
    expect(report.exceptions[0].result).toBe('MINOR');
    expect(report.exceptions[0].feedback).toBe('Backdrop is slightly misaligned.');

    // --- Step 8: append a correction. The confirmed daily report remains an
    // immutable snapshot, while Records and period analytics use the latest
    // result-bearing amendment. ---
    const amendment = await amendmentService.append(
      studio.uid,
      reviewA.uid,
      {
        note: 'Blur is more severe than first assessed.',
        result: 'FAIL',
        findings: [{
          element_id: 'scqce_system_tech',
          defect_id: 'scqcd_system_tech_blurry',
        }],
      },
      user.extId!,
    );
    expect(amendment.revision).toBe(1);
    expect(amendment.result).toBe('FAIL');
    await expect(prisma.sceneQcReview.findUniqueOrThrow({
      where: { uid: reviewA.uid },
      select: { result: true },
    })).resolves.toEqual({ result: 'MINOR' });
    await expect(reportService.getReport(studio.uid, confirmed.id)).resolves.toMatchObject({
      scope: { minor_count: 1, fail_count: 0 },
    });

    // --- Step 9: Records for the date range use the effective correction. ---
    const { items: records } = await recordsQueryService.listRecords(studio.uid, {
      dateFrom: OPERATIONAL_DATE,
      dateTo: OPERATIONAL_DATE,
      clientId: undefined,
      platformId: undefined,
      result: undefined,
      page: 1,
      limit: 20,
    });
    const recordA = records.find((item) => item.review_id === reviewA.uid);
    const recordB = records.find((item) => item.review_id === reviewB.uid);
    expect(recordA?.confirmation_status).toBe('CONFIRMED');
    expect(recordA?.confirmation_revision).toBe(1);
    expect(recordA?.original_result).toBe('MINOR');
    expect(recordA?.result).toBe('FAIL');
    expect(recordA?.amendment_count).toBe(1);
    expect(recordB?.confirmation_status).toBe('CONFIRMED');
    expect(recordB?.confirmation_revision).toBe(1);

    const detailA = await recordsQueryService.getRecordDetail(studio.uid, reviewA.uid);
    expect(detailA.review.result).toBe('MINOR');
    expect(detailA.effective_result).toBe('FAIL');
    expect(detailA.amendments).toHaveLength(1);
    expect(detailA.effective_findings[0]).toMatchObject({
      element_key: 'tech',
      defect_key: 'blurry',
    });

    // --- Step 10: centralized period analytics apply the correction once. ---
    const periodReport = await periodReportService.getReport(
      studio.uid,
      OPERATIONAL_DATE,
      OPERATIONAL_DATE,
    );
    expect(periodReport.summary).toMatchObject({
      total_count: 2,
      pass_count: 1,
      minor_count: 0,
      fail_count: 1,
      pass_percentage: 50,
    });
    expect(periodReport.issue_breakdown).toEqual([expect.objectContaining({
      element_key: 'tech',
      defect_key: 'blurry',
      count: 1,
    })]);

    const audits = await prisma.sceneQcAuditTarget.findMany({
      where: {
        OR: [
          { sceneQcDailyConfirmation: { studioId: studio.id } },
          { sceneQcReview: { showId: { in: [showA.id, showB.id] } } },
          { sceneProfile: { clientId: client.id } },
        ],
      },
    });
    await prisma.audit.deleteMany({ where: { id: { in: audits.map((a) => a.auditId) } } });
  }, 30_000);
});
