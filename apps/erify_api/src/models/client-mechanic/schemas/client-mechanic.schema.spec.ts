import {
  clientMechanicDto,
  createClientMechanicSchema,
  listClientMechanicsQuerySchema,
  updateClientMechanicSchema,
} from './client-mechanic.schema';

describe('clientMechanic schemas', () => {
  it('serializes the entity to the snake_case wire shape (UID, revision, version)', () => {
    const now = new Date('2026-06-08T00:00:00.000Z');

    const dto = clientMechanicDto.parse({
      id: BigInt(1),
      uid: 'cmech_abc',
      client: { uid: 'client_xyz' },
      title: 'Promo mechanic',
      instructionLabel: 'Promotion mechanic',
      instructionBody: 'Read the promo script',
      status: 'active',
      version: 2,
      contentRevision: 4,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    });

    expect(dto).toEqual({
      id: 'cmech_abc',
      client_id: 'client_xyz',
      title: 'Promo mechanic',
      instruction_label: 'Promotion mechanic',
      instruction_body: 'Read the promo script',
      status: 'active',
      version: 2,
      content_revision: 4,
      metadata: {},
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });
  });

  it('transforms create input snake_case -> camelCase payload', () => {
    const payload = createClientMechanicSchema.parse({
      title: 'T',
      instruction_label: 'L',
      instruction_body: 'B',
    });

    expect(payload).toEqual({
      title: 'T',
      instructionLabel: 'L',
      instructionBody: 'B',
      metadata: undefined,
    });
  });

  it('requires version on update for optimistic locking', () => {
    const result = updateClientMechanicSchema.safeParse({ title: 'T' });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown status on update', () => {
    const result = updateClientMechanicSchema.safeParse({ status: 'archived', version: 1 });
    expect(result.success).toBe(false);
  });

  it('layers pagination over the status/search filters', () => {
    const parsed = listClientMechanicsQuerySchema.parse({
      page: 2,
      limit: 20,
      status: 'retired',
      search: 'promo',
    });

    expect(parsed).toMatchObject({
      skip: 20,
      take: 20,
      status: 'retired',
      search: 'promo',
    });
  });
});
