import { Module } from '@nestjs/common';

import { StudioClientMechanicController } from './studio-client-mechanic.controller';

import { ClientModule } from '@/models/client/client.module';
import { ClientMechanicModule } from '@/models/client-mechanic/client-mechanic.module';

@Module({
  imports: [
    ClientMechanicModule,
    ClientModule,
  ],
  controllers: [
    StudioClientMechanicController,
  ],
})
export class StudioClientMechanicModule {}
