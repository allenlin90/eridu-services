import { Module } from '@nestjs/common';

import { SceneMaterialRepository } from './persistence/scene-material.repository';
import { SceneProfileRepository } from './persistence/scene-profile.repository';
import { SceneProfileAssignmentRepository } from './persistence/scene-profile-assignment.repository';
import { SceneMaterialService } from './scene-material.service';
import { SceneProfileService } from './scene-profile.service';
import { SceneProfileAssignmentService } from './scene-profile-assignment.service';

import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { PrismaModule } from '@/prisma/prisma.module';

/**
 * Scene QC capability: Client-owned reusable expected-scene references
 * (materials/profiles) and their Show applicability. Child PR 1 ships
 * persistence and single-model services only — no controllers. See
 * SCENE_QC_IMPLEMENTATION_PLAN.md §4 and §10 (Child PR 1).
 */
@Module({
  imports: [PrismaModule, UidGeneratorModule],
  providers: [
    SceneMaterialRepository,
    SceneMaterialService,
    SceneProfileRepository,
    SceneProfileService,
    SceneProfileAssignmentRepository,
    SceneProfileAssignmentService,
  ],
  exports: [SceneMaterialService, SceneProfileService, SceneProfileAssignmentService],
})
export class SceneQcModule {}
