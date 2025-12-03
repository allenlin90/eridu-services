import { Module } from '@nestjs/common';

import { AdminStudioController } from './admin-studio.controller';

import { StudioModule } from '@/models/studio/studio.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [StudioModule, UtilityModule],
  controllers: [AdminStudioController],
})
export class AdminStudioModule {}
