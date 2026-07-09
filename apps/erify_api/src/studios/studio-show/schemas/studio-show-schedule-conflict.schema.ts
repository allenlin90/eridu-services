import { createZodDto } from 'nestjs-zod';

import { resolveScheduleConflictSchema } from '@eridu/api-types/shows';

export class ResolveScheduleConflictDto extends createZodDto(resolveScheduleConflictSchema) {}
