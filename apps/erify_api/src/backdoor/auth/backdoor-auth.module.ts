import { Module } from '@nestjs/common';

import { BackdoorAuthController } from './backdoor-auth.controller';

import { AuthModule } from '@/lib/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [BackdoorAuthController],
})
export class BackdoorAuthModule {}
