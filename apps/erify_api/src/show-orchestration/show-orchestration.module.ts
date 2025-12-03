import { Module } from '@nestjs/common';

import { ShowOrchestrationService } from './show-orchestration.service';

import { ShowModule } from '@/models/show/show.module';
import { ShowMcModule } from '@/models/show-mc/show-mc.module';
import { ShowPlatformModule } from '@/models/show-platform/show-platform.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule, ShowModule, ShowMcModule, ShowPlatformModule],
  providers: [ShowOrchestrationService],
  exports: [ShowOrchestrationService],
})
export class ShowOrchestrationModule {}
