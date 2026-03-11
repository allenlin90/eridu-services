import { createUserSchema, userWithCreatorDto } from './user.schema';

describe('userSchema', () => {
  describe('createUserSchema', () => {
    it('maps creator input alias to internal creator payload', () => {
      const parsed = createUserSchema.parse({
        email: 'creator@example.com',
        name: 'Creator User',
        creator: {
          name: 'Creator One',
          alias_name: 'Creator Alias',
          metadata: { source: 'test' },
        },
      });

      expect(parsed.creator).toEqual({
        name: 'Creator One',
        aliasName: 'Creator Alias',
        metadata: { source: 'test' },
      });
    });

    it('rejects legacy mc input alias', () => {
      const result = createUserSchema.safeParse({
        email: 'creator@example.com',
        name: 'Creator User',
        mc: {
          name: 'Legacy MC Name',
          alias_name: 'Legacy MC Alias',
        },
      });

      expect(result.success).toBe(false);
    });
  });

  describe('userWithCreatorDto', () => {
    it('emits creator payload only', () => {
      const now = new Date('2026-03-11T12:00:00.000Z');
      const dto = userWithCreatorDto.parse({
        id: BigInt(1),
        uid: 'user_123',
        extId: 'ext_123',
        email: 'creator@example.com',
        name: 'Creator User',
        profileUrl: null,
        metadata: {},
        createdAt: now,
        updatedAt: now,
        mc: {
          id: BigInt(2),
          uid: 'mc_123',
          userId: BigInt(1),
          name: 'Creator One',
          aliasName: 'Creator Alias',
          isBanned: false,
          metadata: {},
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
      });

      expect(dto.creator).toEqual({
        id: 'mc_123',
        name: 'Creator One',
        alias_name: 'Creator Alias',
        is_banned: false,
        metadata: {},
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });
      expect(dto).not.toHaveProperty('mc');
    });
  });
});
