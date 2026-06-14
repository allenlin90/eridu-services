// ============================================================================
// Service Layer Payload Types
// ============================================================================
// NOTE: These types CAN use Prisma types to define the payload shape.
// Services import these payload types, NOT Prisma types directly.
import type { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import {
  clientMechanicApiResponseSchema,
  createClientMechanicInputSchema,
  listClientMechanicsFilterSchema,
  MECHANIC_STATUS,
  updateClientMechanicInputSchema,
} from '@eridu/api-types/client-mechanics';

import { paginationQuerySchema } from '@/lib/pagination/pagination.schema';
import { ClientService } from '@/models/client/client.service';
import { ClientMechanicService } from '@/models/client-mechanic/client-mechanic.service';

const mechanicStatusValues = Object.values(MECHANIC_STATUS) as [string, ...string[]];

// Internal entity shape (DB row -> DTO transform input).
export const clientMechanicSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(ClientMechanicService.UID_PREFIX),
  client: z.object({ uid: z.string().startsWith(ClientService.UID_PREFIX) }),
  title: z.string(),
  instructionLabel: z.string(),
  instructionBody: z.string(),
  status: z.enum(mechanicStatusValues),
  version: z.number().int(),
  contentRevision: z.number().int(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// API input schemas (snake_case input, transform to camelCase payloads).
export const createClientMechanicSchema = createClientMechanicInputSchema.transform((data) => ({
  title: data.title,
  instructionLabel: data.instruction_label,
  instructionBody: data.instruction_body,
  metadata: data.metadata,
}));

export const updateClientMechanicSchema = updateClientMechanicInputSchema.transform((data) => ({
  title: data.title,
  instructionLabel: data.instruction_label,
  instructionBody: data.instruction_body,
  status: data.status,
  metadata: data.metadata,
  version: data.version,
}));

export const clientMechanicDto = clientMechanicSchema
  .transform((obj) => ({
    id: obj.uid,
    client_id: obj.client.uid,
    title: obj.title,
    instruction_label: obj.instructionLabel,
    instruction_body: obj.instructionBody,
    status: obj.status,
    version: obj.version,
    content_revision: obj.contentRevision,
    metadata: obj.metadata,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(clientMechanicApiResponseSchema);

// DTOs for input/output.
export class CreateClientMechanicDto extends createZodDto(createClientMechanicSchema) {}
export class UpdateClientMechanicDto extends createZodDto(updateClientMechanicSchema) {}
export class ClientMechanicDto extends createZodDto(clientMechanicDto) {}

// List query schema (pagination + status/search filter).
export const listClientMechanicsQuerySchema = paginationQuerySchema
  .and(listClientMechanicsFilterSchema)
  .transform((data) => ({ ...data }));

export class ListClientMechanicsQueryDto extends createZodDto(listClientMechanicsQuerySchema) {
  declare page: number;
  declare limit: number;
  declare take: number;
  declare skip: number;
  declare sort: 'asc' | 'desc';
  declare search: string | undefined;
  declare status: 'active' | 'retired' | undefined;
}

/**
 * Payload for creating a client mechanic (service layer).
 */
export type CreateClientMechanicPayload = {
  title: string;
  instructionLabel: string;
  instructionBody: string;
  metadata?: Record<string, any>;
};

/**
 * Payload for updating a client mechanic (service layer). `version` is the
 * optimistic-lock token the caller last read.
 */
export type UpdateClientMechanicPayload = {
  title?: string;
  instructionLabel?: string;
  instructionBody?: string;
  status?: 'active' | 'retired';
  metadata?: Record<string, any>;
  version: number;
};

/**
 * Type-safe order-by options for client mechanics.
 */
export type ClientMechanicOrderBy = Pick<
  Prisma.ClientMechanicOrderByWithRelationInput,
  'title' | 'status' | 'createdAt' | 'updatedAt'
>;
