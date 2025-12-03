import { Module } from '@nestjs/common';

import { ShowTypeRepository } from './show-type.repository';
import { ShowTypeService } from './show-type.service';

import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, UtilityModule],
  providers: [ShowTypeRepository, ShowTypeService],
  exports: [ShowTypeService],
})
export class ShowTypeModule {}
