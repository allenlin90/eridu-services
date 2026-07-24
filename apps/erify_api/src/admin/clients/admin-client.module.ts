import { Module } from '@nestjs/common';

import { AdminClientController } from './admin-client.controller';

import { ClientModule } from '@/models/client/client.module';

@Module({
  imports: [ClientModule],
  controllers: [AdminClientController],
})
export class AdminClientModule {}
