import { Module } from '@nestjs/common';

import { PlatformModule } from '@/models/platform/platform.module';
import { UtilityModule } from '@/utility/utility.module';

import { AdminPlatformController } from './admin-platform.controller';

@Module({
  imports: [PlatformModule, UtilityModule],
  controllers: [AdminPlatformController],
})
export class AdminPlatformModule {}
