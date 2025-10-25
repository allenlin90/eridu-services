import { Module } from '@nestjs/common';

import { ShowPlatformModule } from '../../show-platform/show-platform.module';
import { UtilityModule } from '../../utility/utility.module';
import { AdminShowPlatformController } from './admin-show-platform.controller';

@Module({
  imports: [ShowPlatformModule, UtilityModule],
  controllers: [AdminShowPlatformController],
})
export class AdminShowPlatformModule {}
