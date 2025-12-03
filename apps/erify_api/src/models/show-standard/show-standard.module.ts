import { Module } from '@nestjs/common';

import { ShowStandardRepository } from './show-standard.repository';
import { ShowStandardService } from './show-standard.service';

import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, UtilityModule],
  providers: [ShowStandardRepository, ShowStandardService],
  exports: [ShowStandardService],
})
export class ShowStandardModule {}
