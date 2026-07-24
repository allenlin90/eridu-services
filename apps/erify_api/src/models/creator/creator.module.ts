import { Module } from '@nestjs/common';

import { CreatorRepository } from './creator.repository';
import { CreatorService } from './creator.service';

import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule, UidGeneratorModule],
  providers: [CreatorService, CreatorRepository],
  exports: [CreatorService, CreatorRepository],
})
export class CreatorModule {}
