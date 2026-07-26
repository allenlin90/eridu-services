import { Module } from '@nestjs/common';

import { AuditRepository } from './audit.repository';
import { AuditService } from './audit.service';

import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { PrismaModule } from '@/prisma/prisma.module';

/**
 * Foundation module for PR 12.0.1. Provides `AuditService` for downstream
 * consumers (extraction pipeline in PR 12.0.5, manager-override controllers,
 * review surface in PR 12.4). Not registered in `AppModule` yet — the first
 * consuming module will import it directly.
 */
@Module({
  imports: [PrismaModule, UidGeneratorModule],
  providers: [AuditService, AuditRepository],
  exports: [AuditService],
})
export class AuditModule {}
