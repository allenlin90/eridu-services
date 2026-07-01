import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const showAuditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export class ShowAuditQueryDto extends createZodDto(showAuditQuerySchema) {}
