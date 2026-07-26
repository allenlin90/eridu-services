import { Module } from '@nestjs/common';

import { AdminPlatformController } from './http/admin-platform.controller';
import { AdminShowStandardController } from './http/admin-show-standard.controller';
import { AdminShowStatusController } from './http/admin-show-status.controller';
import { AdminShowTypeController } from './http/admin-show-type.controller';
import { ShowCatalogModule } from './show-catalog.module';

@Module({
  imports: [ShowCatalogModule],
  controllers: [
    AdminPlatformController,
    AdminShowStandardController,
    AdminShowStatusController,
    AdminShowTypeController,
  ],
})
export class ShowCatalogHttpModule {}
