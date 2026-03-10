import { Module } from '@nestjs/common';

import { CreatorRepository } from './creator.repository';
import { CreatorService } from './creator.service';

import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, UtilityModule],
  providers: [CreatorService, CreatorRepository],
  exports: [CreatorService, CreatorRepository],
})
export class CreatorModule {}

// TODO(deprecate): Remove MC alias once all consumers migrate to Creator naming
export { CreatorModule as McModule };
