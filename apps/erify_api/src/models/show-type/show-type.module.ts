import { Module } from '@nestjs/common';

import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

import { ShowTypeRepository } from './show-type.repository';
import { ShowTypeService } from './show-type.service';

@Module({
  imports: [PrismaModule, UtilityModule],
  providers: [ShowTypeRepository, ShowTypeService],
  exports: [ShowTypeService],
})
export class ShowTypeModule {}
