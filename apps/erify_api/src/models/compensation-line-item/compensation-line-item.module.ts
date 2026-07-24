import { Module } from '@nestjs/common';

import { CompensationLineItemRepository } from './compensation-line-item.repository';
import { CompensationLineItemService } from './compensation-line-item.service';
import { LineItemTargetResolver } from './line-item-target.resolver';

import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { UserModule } from '@/models/user/user.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule, UidGeneratorModule, UserModule],
  providers: [
    CompensationLineItemService,
    CompensationLineItemRepository,
    LineItemTargetResolver,
  ],
  exports: [CompensationLineItemService],
})
export class CompensationLineItemModule {}
