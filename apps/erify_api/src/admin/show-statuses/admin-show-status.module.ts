import { Module } from '@nestjs/common';

import { AdminShowStatusController } from './admin-show-status.controller';

import { ShowStatusModule } from '@/models/show-status/show-status.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [ShowStatusModule, UtilityModule],
  controllers: [AdminShowStatusController],
})
export class AdminShowStatusModule {}
