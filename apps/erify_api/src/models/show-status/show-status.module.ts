import { Module } from '@nestjs/common';

import { ShowStatusService } from './show-status.service';

import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [UtilityModule],
  providers: [ShowStatusService],
  exports: [ShowStatusService],
})
export class ShowStatusModule {}
