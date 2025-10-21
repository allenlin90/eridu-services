import { Module } from '@nestjs/common';

import { PlatformModule } from '../../platform/platform.module';
import { UtilityModule } from '../../utility/utility.module';
import { AdminPlatformController } from './admin-platform.controller';
import { AdminPlatformService } from './admin-platform.service';

@Module({
  imports: [PlatformModule, UtilityModule],
  controllers: [AdminPlatformController],
  providers: [AdminPlatformService],
  exports: [AdminPlatformService],
})
export class AdminPlatformModule {}
