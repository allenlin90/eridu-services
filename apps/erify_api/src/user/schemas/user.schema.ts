import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { UserService } from '../user.service';

export const userSchema = z.object({
  id: z.number(),
  uid: z.string().startsWith(UserService.UID_PREFIX),
  extId: z.string().nullable(),
  email: z.email(),
  name: z.string(),
  profileUrl: z.url().nullable(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createUserSchema = userSchema
  .pick({
    extId: true,
    email: true,
    name: true,
    profileUrl: true,
    metadata: true,
  })
  .extend({
    extId: z.string().min(1).nullish(),
    profileUrl: z.url().nullish(),
    metadata: z.record(z.string(), z.any()).optional(),
  });

export const updateUserSchema = userSchema
  .pick({
    extId: true,
    email: true,
    name: true,
    profileUrl: true,
    metadata: true,
  })
  .partial();

export const userDto = userSchema.transform((obj) => ({
  id: obj.uid,
  ext_id: obj.extId,
  email: obj.email,
  name: obj.name,
  profile_url: obj.profileUrl,
  created_at: obj.createdAt,
  updated_at: obj.updatedAt,
}));

export type CreateUserSchema = z.infer<typeof createUserSchema>;

export class CreateUserDto extends createZodDto(createUserSchema) {}

export type UserSchema = z.infer<typeof userSchema>;

export class UserDto extends createZodDto(userDto) {}
