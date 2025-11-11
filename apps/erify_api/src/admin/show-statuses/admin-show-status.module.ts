import { Module } from '@nestjs/common';

import { ShowStatusModule } from '@/models/show-status/show-status.module';
import { UtilityModule } from '@/utility/utility.module';

import { AdminShowStatusController } from './admin-show-status.controller';

@Module({
  imports: [ShowStatusModule, UtilityModule],
  controllers: [AdminShowStatusController],
})
export class AdminShowStatusModule {}
