import { Module } from '@nestjs/common';

import { McModule } from '@/models/mc/mc.module';
import { ShowModule } from '@/models/show/show.module';
import { ShowMcModule } from '@/models/show-mc/show-mc.module';
import { UtilityModule } from '@/utility/utility.module';

import { ShowsController } from './shows.controller';
import { ShowsService } from './shows.service';

@Module({
  imports: [ShowModule, ShowMcModule, McModule, UtilityModule],
  controllers: [ShowsController],
  providers: [ShowsService],
  exports: [ShowsService],
})
export class ShowsModule {}
