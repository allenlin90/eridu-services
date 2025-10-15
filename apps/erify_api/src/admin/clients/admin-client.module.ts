import { Module } from '@nestjs/common';

import { ClientModule } from '../../client/client.module';
import { AdminClientController } from './admin-client.controller';
import { AdminClientService } from './admin-client.service';

@Module({
  imports: [ClientModule],
  controllers: [AdminClientController],
  providers: [AdminClientService],
  exports: [AdminClientService],
})
export class AdminClientModule {}
