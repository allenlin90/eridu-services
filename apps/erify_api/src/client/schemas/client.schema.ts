import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { ClientService } from '../client.service';

export const clientSchema = z.object({
  id: z.number(),
  uid: z.string().startsWith(ClientService.UID_PREFIX),
  name: z.string(),
  contactPerson: z.string(),
  contactEmail: z.email(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createClientSchema = clientSchema
  .pick({
    name: true,
    contactPerson: true,
    contactEmail: true,
    metadata: true,
  })
  .extend({
    metadata: z.record(z.string(), z.any()).optional(),
  });

export const updateClientSchema = clientSchema
  .pick({
    name: true,
    contactPerson: true,
    contactEmail: true,
    metadata: true,
  })
  .partial();

export const clientDto = clientSchema.transform((obj) => ({
  id: obj.uid,
  name: obj.name,
  contact_person: obj.contactPerson,
  contact_email: obj.contactEmail,
  created_at: obj.createdAt,
  updated_at: obj.updatedAt,
}));

export class CreateClientDto extends createZodDto(createClientSchema) {}
export class UpdateClientDto extends createZodDto(updateClientSchema) {}
export class ClientDto extends createZodDto(clientDto) {}
