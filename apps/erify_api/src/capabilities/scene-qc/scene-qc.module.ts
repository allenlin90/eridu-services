import { Module } from '@nestjs/common';

import { SceneProfileService } from './scene-profile.service';

import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { PrismaModule } from '@/prisma/prisma.module';

/**
 * Scene QC capability. Owns Scene Profiles, and (from Child PR 3) review
 * outcomes, confirmations, and reports. Never writes Task, TaskTarget, Show,
 * ShowStatus, or Manager Review data.
 *
 * NOT registered in `AppModule` yet: this PR ships no controllers and changes
 * no public route behavior. Child PR 2 adds the HTTP module with the Scene
 * Profile routes and registers it.
 */
@Module({
  imports: [PrismaModule, UidGeneratorModule],
  providers: [SceneProfileService],
  exports: [SceneProfileService],
})
export class SceneQcModule {}
