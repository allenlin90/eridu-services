import { Module } from '@nestjs/common';

import { ShowCreatorRepository } from './show-creator.repository';
import { ShowCreatorService } from './show-creator.service';

import { CreatorModule } from '@/models/creator/creator.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, UtilityModule, CreatorModule],
  providers: [ShowCreatorService, ShowCreatorRepository],
  exports: [ShowCreatorService, ShowCreatorRepository],
})
export class ShowCreatorModule {}

// TODO(deprecate): Remove MC alias once all consumers migrate to Creator naming
export { ShowCreatorModule as ShowMcModule };
