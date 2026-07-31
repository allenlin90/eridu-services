import { UID_PREFIXES } from '@eridu/api-types/constants';
import { SCENE_PROFILE_MAX_FILE_SIZE_BYTES } from '@eridu/api-types/scene-qc';

import { saveSceneProfileSchema, sceneProfileDto, sceneProfileSchema } from './scene-profile.schema';

function buildRecord(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-07-01T00:00:00.000Z');
  return {
    id: BigInt(1),
    uid: 'scprof_abc',
    client: { uid: 'client_xyz' },
    objectKey: 'scene-profiles/client_xyz/reference.png',
    fileUrl: 'https://cdn.example.com/scene-profiles/client_xyz/reference.png',
    mimeType: 'image/png',
    fileSize: 12345,
    sceneType: 'GRAPHIC_BG',
    version: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

describe('sceneProfile schemas', () => {
  describe('sceneProfileDto', () => {
    it('serializes the entity to the snake_case wire shape', () => {
      const now = new Date('2026-07-01T00:00:00.000Z');
      const dto = sceneProfileDto.parse(buildRecord({ createdAt: now, updatedAt: now }));

      expect(dto).toEqual({
        id: 'scprof_abc',
        client_id: 'client_xyz',
        object_key: 'scene-profiles/client_xyz/reference.png',
        file_url: 'https://cdn.example.com/scene-profiles/client_xyz/reference.png',
        mime_type: 'image/png',
        file_size: 12345,
        scene_type: 'GRAPHIC_BG',
        version: 1,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });
    });

    it('maps the internal uid to the external id and never serializes the raw uid', () => {
      const dto = sceneProfileDto.parse(buildRecord());

      expect(dto.id).toBe('scprof_abc');
      expect(dto).not.toHaveProperty('uid');
    });

    it('never serializes deletedAt', () => {
      const dto = sceneProfileDto.parse(buildRecord({ deletedAt: new Date('2026-07-02T00:00:00.000Z') }));

      expect(dto).not.toHaveProperty('deletedAt');
      expect(dto).not.toHaveProperty('deleted_at');
    });

    it('derives client_id from the included client relation', () => {
      const dto = sceneProfileDto.parse(buildRecord({ client: { uid: 'client_other' } }));

      expect(dto.client_id).toBe('client_other');
    });

    it('fails to parse when the client relation is not included — every persistence path must apply sceneProfileDefaultInclude', () => {
      const { client: _client, ...withoutClient } = buildRecord();

      expect(() => sceneProfileDto.parse(withoutClient)).toThrow();
    });

    it('serializes created_at and updated_at as ISO strings', () => {
      const now = new Date('2026-07-03T12:34:56.000Z');
      const dto = sceneProfileDto.parse(buildRecord({ createdAt: now, updatedAt: now }));

      expect(dto.created_at).toBe(now.toISOString());
      expect(dto.updated_at).toBe(now.toISOString());
    });
  });

  describe('sceneProfileSchema', () => {
    it('requires a scprof-prefixed uid', () => {
      const result = sceneProfileSchema.safeParse(buildRecord({ uid: 'not_a_scene_profile_uid' }));
      expect(result.success).toBe(false);
    });
  });

  describe('saveSceneProfileSchema', () => {
    it('transforms all six snake_case keys to camelCase, with version present (replace)', () => {
      const payload = saveSceneProfileSchema.parse({
        object_key: 'scene-profiles/client_xyz/reference.png',
        file_url: 'https://cdn.example.com/scene-profiles/client_xyz/reference.png',
        mime_type: 'image/png',
        file_size: 12345,
        scene_type: 'REAL_BACKDROP',
        version: 3,
      });

      expect(payload).toEqual({
        objectKey: 'scene-profiles/client_xyz/reference.png',
        fileUrl: 'https://cdn.example.com/scene-profiles/client_xyz/reference.png',
        mimeType: 'image/png',
        fileSize: 12345,
        sceneType: 'REAL_BACKDROP',
        version: 3,
      });
    });

    it('transforms all six snake_case keys to camelCase, with version absent (create)', () => {
      const payload = saveSceneProfileSchema.parse({
        object_key: 'scene-profiles/client_xyz/reference.png',
        file_url: 'https://cdn.example.com/scene-profiles/client_xyz/reference.png',
        mime_type: 'image/webp',
        file_size: 999,
        scene_type: 'GRAPHIC_BG',
      });

      expect(payload).toEqual({
        objectKey: 'scene-profiles/client_xyz/reference.png',
        fileUrl: 'https://cdn.example.com/scene-profiles/client_xyz/reference.png',
        mimeType: 'image/webp',
        fileSize: 999,
        sceneType: 'GRAPHIC_BG',
        version: undefined,
      });
    });

    it('rejects a non-image mime type even though the broader SCENE_REFERENCE rule allows application/pdf', () => {
      const result = saveSceneProfileSchema.safeParse({
        object_key: 'k',
        file_url: 'https://cdn.example.com/k',
        mime_type: 'application/pdf',
        file_size: 100,
        scene_type: 'GRAPHIC_BG',
      });

      expect(result.success).toBe(false);
    });

    it('rejects a file_size of 0', () => {
      const result = saveSceneProfileSchema.safeParse({
        object_key: 'k',
        file_url: 'https://cdn.example.com/k',
        mime_type: 'image/png',
        file_size: 0,
        scene_type: 'GRAPHIC_BG',
      });

      expect(result.success).toBe(false);
    });

    it('rejects a negative file_size', () => {
      const result = saveSceneProfileSchema.safeParse({
        object_key: 'k',
        file_url: 'https://cdn.example.com/k',
        mime_type: 'image/png',
        file_size: -1,
        scene_type: 'GRAPHIC_BG',
      });

      expect(result.success).toBe(false);
    });

    it('rejects a file_size above the SCENE_REFERENCE ceiling', () => {
      const result = saveSceneProfileSchema.safeParse({
        object_key: 'k',
        file_url: 'https://cdn.example.com/k',
        mime_type: 'image/png',
        file_size: SCENE_PROFILE_MAX_FILE_SIZE_BYTES + 1,
        scene_type: 'GRAPHIC_BG',
      });

      expect(result.success).toBe(false);
    });

    it('rejects an unknown scene_type', () => {
      const result = saveSceneProfileSchema.safeParse({
        object_key: 'k',
        file_url: 'https://cdn.example.com/k',
        mime_type: 'image/png',
        file_size: 100,
        scene_type: 'VIRTUAL_SET',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('uID_PREFIXES.SCENE_PROFILE', () => {
    it('is scprof and does not collide with any other registered prefix', () => {
      expect(UID_PREFIXES.SCENE_PROFILE).toBe('scprof');

      const otherPrefixes = Object.entries(UID_PREFIXES)
        .filter(([key]) => key !== 'SCENE_PROFILE')
        .map(([, value]) => value);

      for (const other of otherPrefixes) {
        expect(UID_PREFIXES.SCENE_PROFILE.startsWith(other)).toBe(false);
        expect(other.startsWith(UID_PREFIXES.SCENE_PROFILE)).toBe(false);
      }
    });
  });
});
