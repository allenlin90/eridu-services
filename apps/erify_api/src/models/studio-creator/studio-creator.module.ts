import { Module } from '@nestjs/common';

import { StudioCreatorRepository } from './studio-creator.repository';
import { StudioCreatorService } from './studio-creator.service';

import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { CreatorModule } from '@/models/creator/creator.module';
import { UserModule } from '@/models/user/user.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule, UidGeneratorModule, CreatorModule, UserModule],
  providers: [StudioCreatorService, StudioCreatorRepository],
  exports: [StudioCreatorService, StudioCreatorRepository],
})
export class StudioCreatorModelModule {}
