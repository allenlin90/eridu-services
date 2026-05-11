import { Module } from '@nestjs/common';

import { StudioCompensationLineItemController } from './studio-compensation-line-item.controller';

import { CompensationLineItemModule } from '@/models/compensation-line-item/compensation-line-item.module';

@Module({
  imports: [CompensationLineItemModule],
  controllers: [StudioCompensationLineItemController],
})
export class StudioCompensationLineItemModule {}
