import { Module } from '@nestjs/common';

import { UidGeneratorService } from './uid-generator.service';

@Module({
  providers: [UidGeneratorService],
  exports: [UidGeneratorService],
})
export class UidGeneratorModule {}
