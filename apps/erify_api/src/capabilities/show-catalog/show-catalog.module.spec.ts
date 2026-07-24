import { MODULE_METADATA, PATH_METADATA } from '@nestjs/common/constants';

import { AdminPlatformController } from './http/admin-platform.controller';
import { AdminShowStandardController } from './http/admin-show-standard.controller';
import { AdminShowStatusController } from './http/admin-show-status.controller';
import { AdminShowTypeController } from './http/admin-show-type.controller';
import { ShowCatalogModule } from './show-catalog.module';

import { PlatformRepository } from '@/models/platform/platform.repository';
import { PlatformService } from '@/models/platform/platform.service';
import { ShowStandardService } from '@/models/show-standard/show-standard.service';
import { ShowStatusService } from '@/models/show-status/show-status.service';
import { ShowTypeService } from '@/models/show-type/show-type.service';

describe('showCatalogModule', () => {
  it('exports the catalog services without exposing persistence providers', () => {
    const exports = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      ShowCatalogModule,
    ) as unknown[];

    expect(exports).toEqual([
      PlatformService,
      ShowStandardService,
      ShowStatusService,
      ShowTypeService,
    ]);
    expect(exports).not.toContain(PlatformRepository);
  });

  it.each([
    [AdminPlatformController, 'admin/platforms'],
    [AdminShowStandardController, 'admin/show-standards'],
    [AdminShowStatusController, 'admin/show-statuses'],
    [AdminShowTypeController, 'admin/show-types'],
  ])('preserves the route prefix for %p', (controller, route) => {
    expect(Reflect.getMetadata(PATH_METADATA, controller)).toBe(route);
  });
});
