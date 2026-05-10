import { Module } from '@nestjs/common';

import { AdminCompensationLineItemController } from './admin-compensation-line-item.controller';

import { CompensationLineItemModule } from '@/models/compensation-line-item/compensation-line-item.module';

@Module({
  imports: [CompensationLineItemModule],
  controllers: [AdminCompensationLineItemController],
})
export class AdminCompensationLineItemModule {}
