import { Module } from '@nestjs/common';

import { AdminClientController } from './admin-client.controller';

import { ClientModule } from '@/models/client/client.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [ClientModule, UtilityModule],
  controllers: [AdminClientController],
})
export class AdminClientModule {}
