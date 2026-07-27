import { Module } from '@nestjs/common';

import { SceneProfileService } from './scene-profile.service';
import { SceneQcAuditWriter } from './scene-qc-audit.writer';
import { SceneQcEvidenceResolver } from './scene-qc-evidence.resolver';
import { SceneQcQueryService } from './scene-qc-query.service';
import { SceneQcRepository } from './scene-qc-review.repository';
import { SceneQcWorkflowService } from './scene-qc-review-workflow.service';

import { StorageModule } from '@/lib/storage/storage.module';
import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { UserModule } from '@/models/user/user.module';
import { PrismaModule } from '@/prisma/prisma.module';

/**
 * Scene QC capability. Owns Scene Profiles and (from Child PR 3) Daily Review
 * outcomes. Never writes Task, TaskTarget, Show, ShowStatus, or Manager
 * Review data.
 *
 * `SceneQcAuditWriter`, `SceneQcRepository`, and `SceneQcEvidenceResolver` are
 * private (providers only, never exported). `SceneQcRepository` writes the
 * shared `Audit` envelope plus the capability-owned `SceneQcAuditTarget`
 * junction directly through `txHost.tx.audit`, so `AuditModule` is
 * deliberately ABSENT from this module's imports. `SceneQcRepository` and
 * `SceneQcEvidenceResolver` also read `txHost.tx.show` / `txHost.tx.task`
 * directly as capability-local, read-only, purpose-shaped projections (OQ-9)
 * -- Scene QC never writes those tables.
 *
 * `SceneProfileService` is consumed IN-MODULE by `SceneQcWorkflowService`
 * (Client Scene Profile snapshot at review save time) in addition to being
 * exported for the Scene Profile HTTP controller.
 *
 * Registered in `AppModule` transitively via `StudiosModule` importing
 * `SceneQcHttpModule`.
 */
@Module({
  imports: [PrismaModule, UidGeneratorModule, StorageModule, UserModule],
  providers: [
    SceneProfileService,
    SceneQcAuditWriter,
    SceneQcRepository,
    SceneQcEvidenceResolver,
    SceneQcQueryService,
    SceneQcWorkflowService,
  ],
  exports: [SceneProfileService, SceneQcQueryService, SceneQcWorkflowService],
})
export class SceneQcModule {}
