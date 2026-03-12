import { Module } from '@nestjs/common';

import { AdminCreatorController } from './admin-creator.controller';

import { CreatorModule } from '@/models/creator/creator.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [CreatorModule, UtilityModule],
  controllers: [AdminCreatorController],
})
export class AdminCreatorModule {}
