import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import {
  clientApiResponseSchema,
  createClientInputSchema,
  updateClientInputSchema,
} from '@eridu/api-types/clients';

import { ClientService } from '@/models/client/client.service';

export const clientSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(ClientService.UID_PREFIX),
  name: z.string(),
  contactPerson: z.string(),
  contactEmail: z.email(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// API input schema (snake_case input, transforms to camelCase)
export const createClientSchema = createClientInputSchema.transform((data) => ({
  name: data.name,
  contactPerson: data.contact_person,
  contactEmail: data.contact_email,
  metadata: data.metadata,
}));

// API input schema (snake_case input, transforms to camelCase)
export const updateClientSchema = updateClientInputSchema.transform((data) => ({
  name: data.name,
  contactPerson: data.contact_person,
  contactEmail: data.contact_email,
  metadata: data.metadata,
}));

export const clientDto = clientSchema
  .transform((obj) => ({
    id: obj.uid,
    name: obj.name,
    contact_person: obj.contactPerson,
    contact_email: obj.contactEmail,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(clientApiResponseSchema);

// DTOs for input/output
export class CreateClientDto extends createZodDto(createClientSchema) {}
export class UpdateClientDto extends createZodDto(updateClientSchema) {}
export class ClientDto extends createZodDto(clientDto) {}
