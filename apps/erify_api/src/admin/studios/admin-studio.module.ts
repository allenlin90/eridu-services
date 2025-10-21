import { Module } from '@nestjs/common';

import { StudioModule } from '../../studio/studio.module';
import { UtilityModule } from '../../utility/utility.module';
import { AdminStudioController } from './admin-studio.controller';
import { AdminStudioService } from './admin-studio.service';

@Module({
  imports: [StudioModule, UtilityModule],
  controllers: [AdminStudioController],
  providers: [AdminStudioService],
})
export class AdminStudioModule {}
