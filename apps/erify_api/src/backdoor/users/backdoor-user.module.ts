import { Module } from '@nestjs/common';

import { BackdoorUserController } from './backdoor-user.controller';

import { UserModule } from '@/models/user/user.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [UserModule, UtilityModule],
  controllers: [BackdoorUserController],
})
export class BackdoorUserModule {}
