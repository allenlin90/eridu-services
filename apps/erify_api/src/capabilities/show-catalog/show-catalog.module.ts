import { Module } from '@nestjs/common';

import { AdminPlatformController } from './http/admin-platform.controller';
import { AdminShowStandardController } from './http/admin-show-standard.controller';
import { AdminShowStatusController } from './http/admin-show-status.controller';
import { AdminShowTypeController } from './http/admin-show-type.controller';

import { PlatformRepository } from '@/models/platform/platform.repository';
import { PlatformService } from '@/models/platform/platform.service';
import { ShowStandardRepository } from '@/models/show-standard/show-standard.repository';
import { ShowStandardService } from '@/models/show-standard/show-standard.service';
import { ShowStatusService } from '@/models/show-status/show-status.service';
import { ShowTypeRepository } from '@/models/show-type/show-type.repository';
import { ShowTypeService } from '@/models/show-type/show-type.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, UtilityModule],
  controllers: [
    AdminPlatformController,
    AdminShowStandardController,
    AdminShowStatusController,
    AdminShowTypeController,
  ],
  providers: [
    PlatformRepository,
    PlatformService,
    ShowStandardRepository,
    ShowStandardService,
    ShowStatusService,
    ShowTypeRepository,
    ShowTypeService,
  ],
  exports: [
    PlatformService,
    ShowStandardService,
    ShowStatusService,
    ShowTypeService,
  ],
})
export class ShowCatalogModule {}
