import { Module } from '@nestjs/common';

import { AdminTaskController } from './admin-task.controller';

import { MembershipModule } from '@/models/membership/membership.module';
import { TaskModule } from '@/models/task/task.module';
import { UserModule } from '@/models/user/user.module';

@Module({
  imports: [TaskModule, UserModule, MembershipModule],
  controllers: [AdminTaskController],
})
export class AdminTaskModule {}
