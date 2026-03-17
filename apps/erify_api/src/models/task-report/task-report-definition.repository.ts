import { Injectable } from '@nestjs/common';
import { Prisma, TaskReportDefinition } from '@prisma/client';

import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Persistence boundary for task report definitions.
 * Use case: isolate Prisma-level definition CRUD from service logic.
 */
@Injectable()
export class TaskReportDefinitionRepository extends BaseRepository<
  TaskReportDefinition,
  Prisma.TaskReportDefinitionCreateInput,
  Prisma.TaskReportDefinitionUpdateInput,
  Prisma.TaskReportDefinitionWhereInput
> {
  constructor(prisma: PrismaService) {
    super(new PrismaModelWrapper(prisma.taskReportDefinition));
  }
}
