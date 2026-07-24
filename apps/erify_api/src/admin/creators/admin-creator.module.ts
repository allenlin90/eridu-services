import { Module } from '@nestjs/common';

import { AdminCreatorController } from './admin-creator.controller';

import { CreatorModule } from '@/models/creator/creator.module';

@Module({
  imports: [CreatorModule],
  controllers: [AdminCreatorController],
})
export class AdminCreatorModule {}
