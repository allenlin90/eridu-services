import { Module } from '@nestjs/common';

import { ClientRepository } from './client.repository';
import { ClientService } from './client.service';

import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule, UidGeneratorModule],
  providers: [ClientService, ClientRepository],
  exports: [ClientService],
})
export class ClientModule {}
