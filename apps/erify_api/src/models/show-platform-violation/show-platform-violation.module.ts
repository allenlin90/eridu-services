import { Module } from '@nestjs/common';

import { ShowPlatformViolationRepository } from './show-platform-violation.repository';
import { ShowPlatformViolationService } from './show-platform-violation.service';

import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, UtilityModule],
  providers: [ShowPlatformViolationService, ShowPlatformViolationRepository],
  exports: [ShowPlatformViolationService],
})
export class ShowPlatformViolationModule {}
