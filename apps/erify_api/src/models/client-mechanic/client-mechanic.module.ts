import { Module } from '@nestjs/common';

import { ClientMechanicRepository } from './client-mechanic.repository';
import { ClientMechanicService } from './client-mechanic.service';

import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { UserModule } from '@/models/user/user.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule, UidGeneratorModule, UserModule],
  providers: [ClientMechanicService, ClientMechanicRepository],
  exports: [ClientMechanicService],
})
export class ClientMechanicModule {}
