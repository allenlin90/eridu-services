import { Module } from '@nestjs/common';

import { ShowsController } from './shows.controller';
import { ShowsService } from './shows.service';

import { CreatorModule } from '@/models/creator/creator.module';
import { ShowModule } from '@/models/show/show.module';
import { ShowCreatorModule } from '@/models/show-creator/show-creator.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [ShowModule, ShowCreatorModule, CreatorModule, UtilityModule],
  controllers: [ShowsController],
  providers: [ShowsService],
  exports: [ShowsService],
})
export class ShowsModule {}
