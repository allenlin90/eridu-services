import { Module } from '@nestjs/common';

import { StudioSharedFieldsController } from './studio-shared-fields.controller';

import { StudioModule } from '@/models/studio/studio.module';

@Module({
  imports: [StudioModule],
  controllers: [StudioSharedFieldsController],
})
export class StudioSettingsModule {}
