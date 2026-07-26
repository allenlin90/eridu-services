import {
  createSceneProfileRevisionSchema,
  createSceneProfileSchema,
  listSceneProfilesQuerySchema,
  sceneProfileDto,
  updateSceneProfileSchema,
} from './scene-profile.schema';

describe('sceneProfile schemas', () => {
  it('serializes the entity to the snake_case wire shape with a current revision', () => {
    const now = new Date('2026-06-08T00:00:00.000Z');

    const dto = sceneProfileDto.parse({
      id: BigInt(1),
      uid: 'scprof_abc',
      client: { uid: 'client_xyz' },
      name: 'Default composition',
      description: 'Standard backdrop',
      status: 'ACTIVE',
      isDefault: true,
      sceneType: 'REAL_BACKDROP',
      version: 3,
      revisions: [
        {
          id: BigInt(2),
          uid: 'scprev_def',
          revision: 2,
          profileName: 'Default composition',
          profileDescription: 'Standard backdrop',
          sceneType: 'REAL_BACKDROP',
          materials: [
            {
              label: 'Client logo',
              sortOrder: 0,
              studio: { uid: 'std_1' },
              platform: null,
              materialRevision: {
                uid: 'scmrev_1',
                revision: 1,
                objectKey: 'scene-qc/scmat_1/1.png',
                fileUrl: 'https://cdn.example.com/scene-qc/scmat_1/1.png',
                mimeType: 'image/png',
                material: { uid: 'scmat_1' },
              },
            },
          ],
          createdBy: { uid: 'user_1' },
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    });

    expect(dto).toEqual({
      id: 'scprof_abc',
      client_id: 'client_xyz',
      name: 'Default composition',
      description: 'Standard backdrop',
      status: 'ACTIVE',
      is_default: true,
      scene_type: 'REAL_BACKDROP',
      version: 3,
      current_revision: {
        id: 'scprev_def',
        revision: 2,
        profile_name: 'Default composition',
        profile_description: 'Standard backdrop',
        scene_type: 'REAL_BACKDROP',
        materials: [
          {
            material_id: 'scmat_1',
            material_revision_id: 'scmrev_1',
            revision: 1,
            label: 'Client logo',
            sort_order: 0,
            studio_id: 'std_1',
            platform_id: null,
            object_key: 'scene-qc/scmat_1/1.png',
            file_url: 'https://cdn.example.com/scene-qc/scmat_1/1.png',
            mime_type: 'image/png',
          },
        ],
        created_by: 'user_1',
        created_at: now.toISOString(),
      },
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });
    expect(dto).not.toHaveProperty('uid');
  });

  it('serializes null when there is no current revision', () => {
    const now = new Date('2026-06-08T00:00:00.000Z');

    const dto = sceneProfileDto.parse({
      id: BigInt(1),
      uid: 'scprof_abc',
      client: { uid: 'client_xyz' },
      name: 'Draft profile',
      description: null,
      status: 'ACTIVE',
      isDefault: false,
      sceneType: 'GRAPHIC_BG',
      version: 1,
      revisions: [],
      createdAt: now,
      updatedAt: now,
    });

    expect(dto.current_revision).toBeNull();
  });

  it('transforms create input snake_case -> camelCase payload', () => {
    const payload = createSceneProfileSchema.parse({
      name: 'Default composition',
      scene_type: 'GRAPHIC_BG',
    });

    expect(payload).toEqual({
      name: 'Default composition',
      description: undefined,
      sceneType: 'GRAPHIC_BG',
    });
  });

  it('requires version on update for optimistic locking', () => {
    const result = updateSceneProfileSchema.safeParse({ name: 'Renamed' });
    expect(result.success).toBe(false);
  });

  it('transforms composition-save input and derives sort_order from array position', () => {
    const payload = createSceneProfileRevisionSchema.parse({
      materials: [
        { material_revision_id: 'scmrev_1', label: 'Logo' },
        { material_revision_id: 'scmrev_2', studio_id: 'std_1' },
      ],
      version: 2,
    });

    expect(payload).toEqual({
      materials: [
        {
          materialRevisionUid: 'scmrev_1',
          label: 'Logo',
          studioUid: undefined,
          platformUid: undefined,
          sortOrder: 0,
        },
        {
          materialRevisionUid: 'scmrev_2',
          label: undefined,
          studioUid: 'std_1',
          platformUid: undefined,
          sortOrder: 1,
        },
      ],
      version: 2,
    });
  });

  it('rejects an empty materials array on composition save', () => {
    const result = createSceneProfileRevisionSchema.safeParse({ materials: [], version: 0 });
    expect(result.success).toBe(false);
  });

  it('layers pagination over the client scope/status/search filters', () => {
    const parsed = listSceneProfilesQuerySchema.parse({
      page: 1,
      limit: 10,
      client_id: 'client_xyz',
    });

    expect(parsed).toMatchObject({
      skip: 0,
      take: 10,
      clientUid: 'client_xyz',
    });
  });
});
