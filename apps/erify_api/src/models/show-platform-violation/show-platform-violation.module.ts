import { Module } from '@nestjs/common';

import { ShowPlatformViolationRepository } from './show-platform-violation.repository';
import { ShowPlatformViolationService } from './show-platform-violation.service';

import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule, UidGeneratorModule],
  providers: [ShowPlatformViolationService, ShowPlatformViolationRepository],
  exports: [ShowPlatformViolationService],
})
export class ShowPlatformViolationModule {}
