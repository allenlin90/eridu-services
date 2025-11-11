import { Module } from '@nestjs/common';

import { ClientModule } from '@/models/client/client.module';
import { UtilityModule } from '@/utility/utility.module';

import { AdminClientController } from './admin-client.controller';

@Module({
  imports: [ClientModule, UtilityModule],
  controllers: [AdminClientController],
})
export class AdminClientModule {}
