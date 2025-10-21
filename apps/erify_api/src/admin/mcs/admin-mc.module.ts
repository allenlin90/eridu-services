import { Module } from '@nestjs/common';

import { McModule } from '../../mc/mc.module';
import { UserModule } from '../../user/user.module';
import { UtilityModule } from '../../utility/utility.module';
import { AdminMcController } from './admin-mc.controller';
import { AdminMcService } from './admin-mc.service';

@Module({
  imports: [McModule, UserModule, UtilityModule],
  controllers: [AdminMcController],
  providers: [AdminMcService],
  exports: [AdminMcService],
})
export class AdminMcModule {}
