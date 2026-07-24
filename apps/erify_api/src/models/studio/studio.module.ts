import { Module } from '@nestjs/common';

import { StudioRepository } from './studio.repository';
import { StudioService } from './studio.service';

import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule, UidGeneratorModule],
  providers: [StudioService, StudioRepository],
  exports: [StudioService],
})
export class StudioModule {}
