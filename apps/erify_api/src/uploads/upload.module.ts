import { Module } from '@nestjs/common';

import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

import { StorageModule } from '@/lib/storage/storage.module';
import { TaskModule } from '@/models/task/task.module';

@Module({
  imports: [StorageModule, TaskModule],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
