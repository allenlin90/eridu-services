import { Module } from '@nestjs/common';

import { StudioClientMechanicController } from './studio-client-mechanic.controller';

import { ClientModule } from '@/models/client/client.module';
import { ClientMechanicModule } from '@/models/client-mechanic/client-mechanic.module';
import { ShowModule } from '@/models/show/show.module';

@Module({
  imports: [
    ClientMechanicModule,
    ClientModule,
    ShowModule,
  ],
  controllers: [
    StudioClientMechanicController,
  ],
})
export class StudioClientMechanicModule {}
