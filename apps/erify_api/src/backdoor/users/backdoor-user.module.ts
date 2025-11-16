import { Module } from '@nestjs/common';

import { UserModule } from '@/models/user/user.module';
import { UtilityModule } from '@/utility/utility.module';

import { BackdoorUserController } from './backdoor-user.controller';

@Module({
  imports: [UserModule, UtilityModule],
  controllers: [BackdoorUserController],
})
export class BackdoorUserModule {}
