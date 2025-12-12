import { Module } from '@nestjs/common';

import { BackdoorStudioController } from './backdoor-studio.controller';

import { StudioModule } from '@/models/studio/studio.module';

@Module({
  imports: [StudioModule],
  controllers: [BackdoorStudioController],
})
export class BackdoorStudioModule {}
