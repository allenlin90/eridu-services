import { Module } from '@nestjs/common';

import { StudioCreatorRepository } from './studio-creator.repository';
import { StudioCreatorService } from './studio-creator.service';

import { CreatorModule } from '@/models/creator/creator.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, UtilityModule, CreatorModule],
  providers: [StudioCreatorRepository, StudioCreatorService],
  exports: [StudioCreatorRepository, StudioCreatorService],
})
export class StudioCreatorModelModule {}

export { StudioCreatorModelModule as StudioMcModelModule };
