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
