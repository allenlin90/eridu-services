import { Module } from '@nestjs/common';

import { AuthModule } from '@/lib/auth/auth.module';

import { BackdoorAuthController } from './backdoor-auth.controller';

@Module({
  imports: [AuthModule],
  controllers: [BackdoorAuthController],
})
export class BackdoorAuthModule {}
