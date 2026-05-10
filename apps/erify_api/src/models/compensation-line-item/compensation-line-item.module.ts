import { Module } from '@nestjs/common';

import { CompensationLineItemRepository } from './compensation-line-item.repository';
import { CompensationLineItemService } from './compensation-line-item.service';
import { LineItemTargetResolver } from './line-item-target.resolver';

import { UserModule } from '@/models/user/user.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, UtilityModule, UserModule],
  providers: [
    CompensationLineItemService,
    CompensationLineItemRepository,
    LineItemTargetResolver,
  ],
  exports: [CompensationLineItemService],
})
export class CompensationLineItemModule {}
