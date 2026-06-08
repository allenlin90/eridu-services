import { Module } from '@nestjs/common';

import { StudioCompensationLineItemModule } from './studio-compensation-line-item/studio-compensation-line-item.module';
import { StudioCostsModule } from './studio-costs/studio-costs.module';
import { StudioCreatorApiModule } from './studio-creator/studio-creator.module';
import { StudioLookupModule } from './studio-lookup/studio-lookup.module';
import { StudioMembershipModule } from './studio-membership/studio-membership.module';
import { StudioPerformanceModule } from './studio-performance/studio-performance.module';
import { StudioSettingsModule } from './studio-settings/studio-settings.module';
import { StudioShiftApiModule } from './studio-shift/studio-shift.module';
import { StudioShowModule } from './studio-show/studio-show.module';
import { StudioTaskModule } from './studio-task/studio-task.module';
import { StudioTaskReportModule } from './studio-task-report/studio-task-report.module';
import { StudioTaskTemplateModule } from './studio-task-template/studio-task-template.module';

@Module({
  imports: [
    StudioLookupModule,
    StudioCreatorApiModule,
    StudioMembershipModule,
    StudioSettingsModule,
    StudioShiftApiModule,
    StudioTaskTemplateModule,
    StudioTaskModule,
    StudioTaskReportModule,
    StudioShowModule,
    StudioCompensationLineItemModule,
    StudioCostsModule,
    StudioPerformanceModule,
  ],
  exports: [
    StudioTaskTemplateModule,
    StudioTaskModule,
    StudioShowModule,
    StudioCompensationLineItemModule,
  ],
})
export class StudiosModule {}
