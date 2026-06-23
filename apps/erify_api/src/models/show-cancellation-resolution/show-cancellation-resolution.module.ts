import { Module } from '@nestjs/common';

import { ShowCancellationResolutionRepository } from './show-cancellation-resolution.repository';
import { ShowCancellationResolutionService } from './show-cancellation-resolution.service';

import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, UtilityModule],
  providers: [ShowCancellationResolutionRepository, ShowCancellationResolutionService],
  exports: [ShowCancellationResolutionService],
})
export class ShowCancellationResolutionModule {}
