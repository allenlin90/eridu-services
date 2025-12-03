import { Module } from '@nestjs/common';

import { AdminShowPlatformController } from './admin-show-platform.controller';

import { ShowPlatformModule } from '@/models/show-platform/show-platform.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [ShowPlatformModule, UtilityModule],
  controllers: [AdminShowPlatformController],
})
export class AdminShowPlatformModule {}
