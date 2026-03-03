import { Module } from '@nestjs/common';

import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

import { StorageModule } from '@/lib/storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
