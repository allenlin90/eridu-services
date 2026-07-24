import { Module } from '@nestjs/common';

import { AdminShowPlatformController } from './admin-show-platform.controller';

import { ShowPlatformModule } from '@/models/show-platform/show-platform.module';

@Module({
  imports: [ShowPlatformModule],
  controllers: [AdminShowPlatformController],
})
export class AdminShowPlatformModule {}
