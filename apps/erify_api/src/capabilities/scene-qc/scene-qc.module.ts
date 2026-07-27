import { Module } from '@nestjs/common';

import { SceneProfileService } from './scene-profile.service';
import { SceneQcAuditWriter } from './scene-qc-audit.writer';

import { StorageModule } from '@/lib/storage/storage.module';
import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { UserModule } from '@/models/user/user.module';
import { PrismaModule } from '@/prisma/prisma.module';

/**
 * Scene QC capability. Owns Scene Profiles, and (from Child PR 3) review
 * outcomes, confirmations, and reports. Never writes Task, TaskTarget, Show,
 * ShowStatus, or Manager Review data.
 *
 * `SceneQcAuditWriter` is private (providers only, never exported): it writes
 * the shared `Audit` envelope plus the capability-owned `SceneQcAuditTarget`
 * junction directly through `txHost.tx.audit`, so `AuditModule` is
 * deliberately ABSENT from this module's imports.
 *
 * Registered in `AppModule` transitively via `StudiosModule` importing
 * `SceneQcHttpModule` (this PR's Scene Profile routes).
 */
@Module({
  imports: [PrismaModule, UidGeneratorModule, StorageModule, UserModule],
  providers: [SceneProfileService, SceneQcAuditWriter],
  exports: [SceneProfileService],
})
export class SceneQcModule {}
