import { Module } from '@nestjs/common';

import { BackdoorUserController } from './backdoor-user.controller';

import { UserModule } from '@/models/user/user.module';

@Module({
  imports: [UserModule],
  controllers: [BackdoorUserController],
})
export class BackdoorUserModule {}
