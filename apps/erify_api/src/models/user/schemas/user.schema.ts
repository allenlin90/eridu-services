import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { UserService } from '@/models/user/user.service';

export const userSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(UserService.UID_PREFIX),
  extId: z.string().nullable(),
  email: z.email(),
  name: z.string(),
  profileUrl: z.url().nullable(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// API input schema (snake_case input, transforms to camelCase)
export const createUserSchema = z
  .object({
    ext_id: z.string().min(1).nullish(),
    email: z.email(),
    name: z.string(),
    profile_url: z.url().nullish(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    extId: data.ext_id,
    email: data.email,
    name: data.name,
    profileUrl: data.profile_url,
    metadata: data.metadata,
  }));

// API input schema (snake_case input, transforms to camelCase)
export const updateUserSchema = z
  .object({
    ext_id: z.string().min(1).nullish(),
    email: z.email().optional(),
    name: z.string().optional(),
    profile_url: z.url().nullish(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    extId: data.ext_id,
    email: data.email,
    name: data.name,
    profileUrl: data.profile_url,
    metadata: data.metadata,
  }));

export const userDto = userSchema
  .transform((obj) => ({
    id: obj.uid,
    ext_id: obj.extId,
    email: obj.email,
    name: obj.name,
    profile_url: obj.profileUrl,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(
    z.object({
      id: z.string(),
      ext_id: z.string().nullable(),
      email: z.email(),
      name: z.string(),
      profile_url: z.url().nullable(),
      created_at: z.iso.datetime(),
      updated_at: z.iso.datetime(),
    }),
  );

export type CreateUserSchema = z.infer<typeof createUserSchema>;

// DTOs for input/output
export class CreateUserDto extends createZodDto(createUserSchema) {}

export type UserSchema = z.infer<typeof userSchema>;

export class UserDto extends createZodDto(userDto) {}

export class UpdateUserDto extends createZodDto(updateUserSchema) {}
