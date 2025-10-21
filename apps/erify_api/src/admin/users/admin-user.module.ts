import { Module } from '@nestjs/common';

import { UserModule } from '../../user/user.module';
import { UtilityModule } from '../../utility/utility.module';
import { AdminUserController } from './admin-user.controller';
import { AdminUserService } from './admin-user.service';

@Module({
  imports: [UserModule, UtilityModule],
  controllers: [AdminUserController],
  providers: [AdminUserService],
  exports: [AdminUserService],
})
export class AdminUserModule {}
