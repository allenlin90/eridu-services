import { Module } from '@nestjs/common';

import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

import { ShowStandardRepository } from './show-standard.repository';
import { ShowStandardService } from './show-standard.service';

@Module({
  imports: [PrismaModule, UtilityModule],
  providers: [ShowStandardRepository, ShowStandardService],
  exports: [ShowStandardService],
})
export class ShowStandardModule {}
