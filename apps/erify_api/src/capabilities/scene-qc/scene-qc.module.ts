import { Module } from '@nestjs/common';

import { SceneProfileService } from './scene-profile.service';
import { SceneQcAmendmentService } from './scene-qc-amendment.service';
import { SceneQcAuditWriter } from './scene-qc-audit.writer';
import { SceneQcConfirmationRepository } from './scene-qc-confirmation.repository';
import { SceneQcConfirmationWorkflowService } from './scene-qc-confirmation-workflow.service';
import { SceneQcEvidenceResolver } from './scene-qc-evidence.resolver';
import { SceneQcPeriodReportQuery } from './scene-qc-period-report.query';
import { SceneQcPeriodReportService } from './scene-qc-period-report.service';
import { SceneQcQueryService } from './scene-qc-query.service';
import { SceneQcRecordsQuery } from './scene-qc-records.query';
import { SceneQcRecordsQueryService } from './scene-qc-records.query.service';
import { SceneQcReportService } from './scene-qc-report.service';
import { SceneQcRepository } from './scene-qc-review.repository';
import { SceneQcWorkflowService } from './scene-qc-review-workflow.service';
import { SceneQcTaxonomyService } from './scene-qc-taxonomy.service';

import { StorageModule } from '@/lib/storage/storage.module';
import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { UserModule } from '@/models/user/user.module';
import { PrismaModule } from '@/prisma/prisma.module';

/**
 * Scene QC capability. Owns Scene Profiles, Daily Review outcomes (Child PR
 * 3), and Daily Confirmation / Records / Manager Report (Child PR 4). Never
 * writes Task, TaskTarget, Show, ShowStatus, or Manager Review data.
 *
 * `SceneQcAuditWriter`, `SceneQcRepository`, `SceneQcConfirmationRepository`,
 * and `SceneQcEvidenceResolver` are private (providers only, never exported).
 * `SceneQcAuditWriter` writes the shared `Audit` envelope plus the
 * capability-owned `SceneQcAuditTarget` junction directly through
 * `txHost.tx.audit`, so `AuditModule` is deliberately ABSENT from this
 * module's imports. `SceneQcRepository` and `SceneQcConfirmationRepository`
 * also read `txHost.tx.show` / `txHost.tx.task` / `txHost.tx.platform`
 * directly as capability-local, read-only, purpose-shaped projections (OQ-9)
 * -- Scene QC never writes those tables.
 *
 * `SceneProfileService` is consumed IN-MODULE by `SceneQcWorkflowService`
 * (Client Scene Profile snapshot at review save time) in addition to being
 * exported for the Scene Profile HTTP controller. Child PR 4 adds no new
 * module import: `PrismaModule`, `UidGeneratorModule`, `StorageModule`, and
 * `UserModule` already cover the confirmation workflow's needs (the
 * confirmation-write path connects to `Studio` by `uid`, so no
 * `StudioModule` import is needed either).
 *
 * Registered in `AppModule` transitively via `StudiosModule` importing
 * `SceneQcHttpModule`.
 */
@Module({
  imports: [PrismaModule, UidGeneratorModule, StorageModule, UserModule],
  providers: [
    SceneProfileService,
    SceneQcAmendmentService,
    SceneQcAuditWriter,
    SceneQcRepository,
    SceneQcConfirmationRepository,
    SceneQcEvidenceResolver,
    SceneQcPeriodReportQuery,
    SceneQcPeriodReportService,
    SceneQcQueryService,
    SceneQcWorkflowService,
    SceneQcConfirmationWorkflowService,
    SceneQcRecordsQueryService,
    SceneQcRecordsQuery,
    SceneQcReportService,
    SceneQcTaxonomyService,
  ],
  exports: [
    SceneProfileService,
    SceneQcAmendmentService,
    SceneQcQueryService,
    SceneQcWorkflowService,
    SceneQcConfirmationWorkflowService,
    SceneQcPeriodReportService,
    SceneQcRecordsQueryService,
    SceneQcReportService,
    SceneQcTaxonomyService,
  ],
})
export class SceneQcModule {}
