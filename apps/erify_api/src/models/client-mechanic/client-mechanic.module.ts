import { Module } from '@nestjs/common';

import { ClientMechanicRepository } from './client-mechanic.repository';
import { ClientMechanicService } from './client-mechanic.service';

import { UserModule } from '@/models/user/user.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, UtilityModule, UserModule],
  providers: [ClientMechanicService, ClientMechanicRepository],
  exports: [ClientMechanicService],
})
export class ClientMechanicModule {}
