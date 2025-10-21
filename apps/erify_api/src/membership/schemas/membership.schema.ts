import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { ClientService } from '../../client/client.service';
import { clientSchema } from '../../client/schemas/client.schema';
import { PlatformService } from '../../platform/platform.service';
import { platformSchema } from '../../platform/schemas/platform.schema';
import { studioSchema } from '../../studio/schemas/studio.schema';
import { StudioService } from '../../studio/studio.service';
import { userDto, userSchema } from '../../user/schemas/user.schema';
import { UserService } from '../../user/user.service';
import { MembershipService } from '../membership.service';

// Define member group types and roles with their descriptions
export const GROUP_TYPE = {
  CLIENT: 'client',
  PLATFORM: 'platform',
  STUDIO: 'studio',
} as const;

export const ROLE = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  MEMBER: 'member',
  GUEST: 'guest',
} as const;

// Union type for group entities
const groupSchema = z.union([clientSchema, platformSchema, studioSchema]);

// Reusable validation functions
const validateUserUid = z.string().startsWith(UserService.UID_PREFIX);

const validateGroupIdMatchesType = (data: {
  group_id: string;
  group_type: string;
}) => {
  switch (data.group_type) {
    case 'client':
      return data.group_id.startsWith(ClientService.UID_PREFIX);
    case 'platform':
      return data.group_id.startsWith(PlatformService.UID_PREFIX);
    case 'studio':
      return data.group_id.startsWith(StudioService.UID_PREFIX);
    default:
      return false;
  }
};

const validateOptionalGroupIdMatchesType = (data: {
  group_id?: string;
  group_type?: string;
}) => {
  // Only validate if both group_id and group_type are provided
  if (data.group_id && data.group_type) {
    return validateGroupIdMatchesType({
      group_id: data.group_id,
      group_type: data.group_type,
    });
  }
  return true; // Skip validation if either is missing
};

export const membershipSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(MembershipService.UID_PREFIX),
  userId: z.bigint(),
  groupId: z.bigint(),
  groupType: z.enum(Object.values(GROUP_TYPE) as [string, ...string[]]),
  role: z.enum(Object.values(ROLE) as [string, ...string[]]),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

// API input schema (snake_case input, transforms to camelCase)
export const createMembershipSchema = z
  .object({
    user_id: validateUserUid,
    group_id: z.string(), // Will be validated based on group_type
    group_type: z.enum(Object.values(GROUP_TYPE) as [string, ...string[]]),
    role: z.enum(Object.values(ROLE) as [string, ...string[]]),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .refine(validateGroupIdMatchesType, {
    message:
      'group_id must match the expected UID pattern for the given group_type',
  })
  .transform((data) => ({
    userId: data.user_id,
    groupId: data.group_id,
    groupType: data.group_type,
    role: data.role,
    metadata: data.metadata || {},
  }));

// API input schema (snake_case input, transforms to camelCase)
export const updateMembershipSchema = z
  .object({
    user_id: validateUserUid.optional(),
    group_id: z.string().optional(), // Will be validated based on group_type if provided
    group_type: z
      .enum(Object.values(GROUP_TYPE) as [string, ...string[]])
      .optional(),
    role: z.enum(Object.values(ROLE) as [string, ...string[]]).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .refine(validateOptionalGroupIdMatchesType, {
    message:
      'group_id must match the expected UID pattern for the given group_type',
  })
  .transform((data) => ({
    userId: data.user_id,
    groupId: data.group_id,
    groupType: data.group_type,
    role: data.role,
    metadata: data.metadata,
  }));

// Basic membership DTO (without related data)
export const membershipDto = membershipSchema.transform((obj) => ({
  id: obj.uid,
  user_id: obj.userId,
  group_id: obj.groupId,
  group_type: obj.groupType,
  role: obj.role,
  metadata: obj.metadata,
  created_at: obj.createdAt,
  updated_at: obj.updatedAt,
}));

// Schema for membership with related data (used in admin endpoints)
export const membershipWithRelationsSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(MembershipService.UID_PREFIX),
  userId: z.bigint(),
  groupId: z.bigint(),
  groupType: z.enum(Object.values(GROUP_TYPE) as [string, ...string[]]),
  role: z.enum(Object.values(ROLE) as [string, ...string[]]),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
  user: userSchema,
  group: groupSchema,
});

// Type for membership with polymorphic group
export type MembershipWithPolymorphicGroup = z.infer<
  typeof membershipWithRelationsSchema
>;

// Transform membership with relations to API format (properly maps UIDs)
export const membershipWithRelationsDto =
  membershipWithRelationsSchema.transform((obj) => ({
    id: obj.uid,
    user_id: obj.user.uid,
    group_id: obj.group.uid,
    group_type: obj.groupType,
    role: obj.role,
    metadata: obj.metadata,
    created_at: obj.createdAt,
    updated_at: obj.updatedAt,
    user: userDto.parse(obj.user),
    group: {
      id: obj.group.uid,
      name: obj.group.name,
      type: obj.groupType,
    },
  }));

export type CreateMembershipSchema = z.infer<typeof createMembershipSchema>;

// DTOs for input/output
export class CreateMembershipDto extends createZodDto(createMembershipSchema) {}

export type MembershipSchema = z.infer<typeof membershipSchema>;

export class MembershipDto extends createZodDto(membershipDto) {}

export class MembershipWithRelationsDto extends createZodDto(
  membershipWithRelationsDto,
) {}

export class UpdateMembershipDto extends createZodDto(updateMembershipSchema) {}

// Service-level internal schemas (camelCase) and assert helpers

export const createMembershipInternalSchema = z
  .object({
    userId: validateUserUid,
    groupId: z.string(), // Will be validated based on groupType
    groupType: z.enum(Object.values(GROUP_TYPE) as [string, ...string[]]),
    role: z.enum(Object.values(ROLE) as [string, ...string[]]),
    metadata: z.record(z.string(), z.any()).default({}),
  })
  .refine(
    (data) =>
      validateGroupIdMatchesType({
        group_id: data.groupId,
        group_type: data.groupType,
      }),
    {
      message:
        'groupId must match the expected UID pattern for the given groupType',
    },
  )
  .strict();

export type CreateMembershipInternal = z.infer<
  typeof createMembershipInternalSchema
>;

export const updateMembershipInternalSchema = z
  .object({
    userId: validateUserUid.optional(),
    groupId: z.string().optional(), // Will be validated based on groupType if provided
    groupType: z
      .enum(Object.values(GROUP_TYPE) as [string, ...string[]])
      .optional(),
    role: z.enum(Object.values(ROLE) as [string, ...string[]]).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .refine(
    (data) =>
      validateOptionalGroupIdMatchesType({
        group_id: data.groupId,
        group_type: data.groupType,
      }),
    {
      message:
        'groupId must match the expected UID pattern for the given groupType',
    },
  )
  .strict();

export type UpdateMembershipInternal = z.infer<
  typeof updateMembershipInternalSchema
>;

export const groupTypeSchema = z.enum(
  Object.values(GROUP_TYPE) as [string, ...string[]],
);

export type GroupType = (typeof GROUP_TYPE)[keyof typeof GROUP_TYPE];

export const roleSchema = z.enum(Object.values(ROLE) as [string, ...string[]]);

// Assert helpers: throw ZodError including all issues
export function assertCreateMembershipInput(
  data: unknown,
): CreateMembershipInternal {
  return createMembershipInternalSchema.parse(data);
}

export function assertUpdateMembershipInput(
  data: unknown,
): UpdateMembershipInternal {
  return updateMembershipInternalSchema.parse(data);
}

export function assertGroupType(value: unknown): string {
  return groupTypeSchema.parse(value);
}

export function assertRole(value: unknown): string {
  return roleSchema.parse(value);
}
