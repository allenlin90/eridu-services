import { Module } from '@nestjs/common';

import { AdminShowCreatorController } from './admin-show-creator.controller';

import { ShowCreatorModule } from '@/models/show-creator/show-creator.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [ShowCreatorModule, UtilityModule],
  controllers: [AdminShowCreatorController],
})
export class AdminShowCreatorModule {}
