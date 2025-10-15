import { Module } from '@nestjs/common';

import { McModule } from '../../mc/mc.module';
import { AdminMcController } from './admin-mc.controller';
import { AdminMcService } from './admin-mc.service';

@Module({
  imports: [McModule],
  controllers: [AdminMcController],
  providers: [AdminMcService],
  exports: [AdminMcService],
})
export class AdminMcModule {}
