import { createUserSchema, userWithMcDto } from './user.schema';

describe('userSchema', () => {
  describe('createUserSchema', () => {
    it('maps creator input alias to internal mc payload', () => {
      const parsed = createUserSchema.parse({
        email: 'creator@example.com',
        name: 'Creator User',
        creator: {
          name: 'Creator One',
          alias_name: 'Creator Alias',
          metadata: { source: 'test' },
        },
      });

      expect(parsed.mc).toEqual({
        name: 'Creator One',
        aliasName: 'Creator Alias',
        metadata: { source: 'test' },
      });
    });

    it('prioritizes creator alias when both creator and mc are provided', () => {
      const parsed = createUserSchema.parse({
        email: 'creator@example.com',
        name: 'Creator User',
        creator: {
          name: 'Creator Name',
          alias_name: 'Creator Alias',
        },
        mc: {
          name: 'Legacy MC Name',
          alias_name: 'Legacy MC Alias',
        },
      });

      expect(parsed.mc).toEqual({
        name: 'Creator Name',
        aliasName: 'Creator Alias',
        metadata: undefined,
      });
    });
  });

  describe('userWithMcDto', () => {
    it('emits creator and legacy mc aliases from the same relation payload', () => {
      const now = new Date('2026-03-11T12:00:00.000Z');
      const dto = userWithMcDto.parse({
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
      expect(dto.mc).toEqual(dto.creator);
    });
  });
});
