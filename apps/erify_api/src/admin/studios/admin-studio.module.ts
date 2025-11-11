import { Module } from '@nestjs/common';

import { StudioModule } from '@/models/studio/studio.module';
import { UtilityModule } from '@/utility/utility.module';

import { AdminStudioController } from './admin-studio.controller';

@Module({
  imports: [StudioModule, UtilityModule],
  controllers: [AdminStudioController],
})
export class AdminStudioModule {}
