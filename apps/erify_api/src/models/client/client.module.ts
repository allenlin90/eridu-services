import { Module } from '@nestjs/common';

import { ClientRepository } from './client.repository';
import { ClientService } from './client.service';

import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, UtilityModule],
  providers: [ClientService, ClientRepository],
  exports: [ClientService],
})
export class ClientModule {}
