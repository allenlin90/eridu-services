import { Module } from '@nestjs/common';

import { AdminShowStandardController } from './admin-show-standard.controller';

import { ShowStandardModule } from '@/models/show-standard/show-standard.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [ShowStandardModule, UtilityModule],
  controllers: [AdminShowStandardController],
})
export class AdminShowStandardModule {}
