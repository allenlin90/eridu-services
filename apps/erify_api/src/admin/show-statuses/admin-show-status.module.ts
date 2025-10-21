import { Module } from '@nestjs/common';

import { ShowStatusModule } from '../../show-status/show-status.module';
import { UtilityModule } from '../../utility/utility.module';
import { AdminShowStatusController } from './admin-show-status.controller';
import { AdminShowStatusService } from './admin-show-status.service';

@Module({
  imports: [ShowStatusModule, UtilityModule],
  controllers: [AdminShowStatusController],
  providers: [AdminShowStatusService],
  exports: [AdminShowStatusService],
})
export class AdminShowStatusModule {}
