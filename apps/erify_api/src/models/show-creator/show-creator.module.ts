import { Module } from '@nestjs/common';

import { ShowCreatorRepository } from './show-creator.repository';
import { ShowCreatorService } from './show-creator.service';

import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, UtilityModule],
  providers: [ShowCreatorService, ShowCreatorRepository],
  exports: [ShowCreatorService, ShowCreatorRepository],
})
export class ShowCreatorModule {}

export { ShowCreatorModule as ShowMcModule };
