import { Module } from '@nestjs/common';

import { ShowCreatorRepository } from './show-creator.repository';
import { ShowCreatorService } from './show-creator.service';

import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule, UidGeneratorModule],
  providers: [ShowCreatorService, ShowCreatorRepository],
  exports: [ShowCreatorService, ShowCreatorRepository],
})
export class ShowCreatorModule {}
