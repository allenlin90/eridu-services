import { Module } from '@nestjs/common';

import { ShowModule } from '@/models/show/show.module';
import { ShowMcModule } from '@/models/show-mc/show-mc.module';
import { ShowPlatformModule } from '@/models/show-platform/show-platform.module';
import { PrismaModule } from '@/prisma/prisma.module';

import { ShowOrchestrationService } from './show-orchestration.service';

@Module({
  imports: [PrismaModule, ShowModule, ShowMcModule, ShowPlatformModule],
  providers: [ShowOrchestrationService],
  exports: [ShowOrchestrationService],
})
export class ShowOrchestrationModule {}
