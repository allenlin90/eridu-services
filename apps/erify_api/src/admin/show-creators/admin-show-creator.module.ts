import { Module } from '@nestjs/common';

import { AdminShowCreatorController } from './admin-show-creator.controller';

import { ShowCreatorModule } from '@/models/show-creator/show-creator.module';

@Module({
  imports: [ShowCreatorModule],
  controllers: [AdminShowCreatorController],
})
export class AdminShowCreatorModule {}
