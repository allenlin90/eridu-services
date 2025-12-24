import { createZodDto } from 'nestjs-zod';
import type { z } from 'zod';

import { profileResponseSchema } from '@eridu/api-types/users';

export { profileResponseSchema };

export type ProfileResponseSchema = z.infer<typeof profileResponseSchema>;

export class ProfileResponseDto extends createZodDto(profileResponseSchema) {}
