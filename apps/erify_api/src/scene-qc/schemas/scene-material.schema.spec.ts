import {
  createSceneMaterialRevisionSchema,
  createSceneMaterialSchema,
  listSceneMaterialsQuerySchema,
  sceneMaterialDto,
  updateSceneMaterialSchema,
} from './scene-material.schema';

describe('sceneMaterial schemas', () => {
  it('serializes the entity to the snake_case wire shape with a latest revision', () => {
    const now = new Date('2026-06-08T00:00:00.000Z');

    const dto = sceneMaterialDto.parse({
      id: BigInt(1),
      uid: 'scmat_abc',
      client: { uid: 'client_xyz' },
      name: 'Client logo',
      status: 'ACTIVE',
      version: 2,
      revisions: [
        {
          id: BigInt(2),
          uid: 'scmrev_def',
          revision: 3,
          objectKey: 'scene-qc/scmat_abc/3.png',
          fileUrl: 'https://cdn.example.com/scene-qc/scmat_abc/3.png',
          mimeType: 'image/png',
          fileSize: 1024,
          createdBy: { uid: 'user_1' },
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    });

    expect(dto).toEqual({
      id: 'scmat_abc',
      client_id: 'client_xyz',
      name: 'Client logo',
      status: 'ACTIVE',
      version: 2,
      latest_revision: {
        id: 'scmrev_def',
        revision: 3,
        object_key: 'scene-qc/scmat_abc/3.png',
        file_url: 'https://cdn.example.com/scene-qc/scmat_abc/3.png',
        mime_type: 'image/png',
        file_size: 1024,
        created_by: 'user_1',
        created_at: now.toISOString(),
      },
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });
    // Internal id / uid are mapped to the wire `id`; the raw fields never serialize.
    expect(dto).not.toHaveProperty('uid');
    expect((dto as Record<string, unknown>).id).not.toBe(BigInt(1));
  });

  it('serializes null when there is no latest revision', () => {
    const now = new Date('2026-06-08T00:00:00.000Z');

    const dto = sceneMaterialDto.parse({
      id: BigInt(1),
      uid: 'scmat_abc',
      client: { uid: 'client_xyz' },
      name: 'Client logo',
      status: 'ACTIVE',
      version: 1,
      revisions: [],
      createdAt: now,
      updatedAt: now,
    });

    expect(dto.latest_revision).toBeNull();
  });

  it('transforms create input snake_case -> camelCase payload', () => {
    const payload = createSceneMaterialSchema.parse({ name: 'Client logo' });
    expect(payload).toEqual({ name: 'Client logo' });
  });

  it('requires version on update for optimistic locking', () => {
    const result = updateSceneMaterialSchema.safeParse({ name: 'Renamed' });
    expect(result.success).toBe(false);
  });

  it('transforms create-revision input and rejects a non-image mime type', () => {
    const payload = createSceneMaterialRevisionSchema.parse({
      object_key: 'scene-qc/scmat_abc/1.png',
      file_url: 'https://cdn.example.com/scene-qc/scmat_abc/1.png',
      mime_type: 'image/png',
      file_size: 2048,
      version: 0,
    });

    expect(payload).toEqual({
      objectKey: 'scene-qc/scmat_abc/1.png',
      fileUrl: 'https://cdn.example.com/scene-qc/scmat_abc/1.png',
      mimeType: 'image/png',
      fileSize: 2048,
      version: 0,
    });

    const rejected = createSceneMaterialRevisionSchema.safeParse({
      object_key: 'scene-qc/scmat_abc/1.pdf',
      file_url: 'https://cdn.example.com/scene-qc/scmat_abc/1.pdf',
      mime_type: 'application/pdf',
      file_size: 2048,
      version: 0,
    });
    expect(rejected.success).toBe(false);
  });

  it('layers pagination over the client scope/status/search filters', () => {
    const parsed = listSceneMaterialsQuerySchema.parse({
      page: 2,
      limit: 20,
      client_id: 'client_xyz',
      status: 'RETIRED',
      search: 'logo',
    });

    expect(parsed).toMatchObject({
      skip: 20,
      take: 20,
      clientUid: 'client_xyz',
      status: 'RETIRED',
      search: 'logo',
    });
  });
});
