import { Module } from '@nestjs/common';

import { AdminPlatformController } from './admin-platform.controller';

import { PlatformModule } from '@/models/platform/platform.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PlatformModule, UtilityModule],
  controllers: [AdminPlatformController],
})
export class AdminPlatformModule {}
