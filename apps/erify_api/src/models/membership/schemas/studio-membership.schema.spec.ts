import {
  listStudioMembersQuerySchema,
} from './studio-membership.schema';

import { paginationQuerySchema } from '@/lib/pagination/pagination.schema';

describe('studioMembershipSchemas', () => {
  describe('paginationQuerySchema', () => {
    it('allows larger limits for shared lookup routes', () => {
      expect(paginationQuerySchema.parse({
        page: 1,
        limit: 200,
      })).toMatchObject({
        page: 1,
        limit: 200,
        skip: 0,
        take: 200,
      });
    });
  });

  describe('listStudioMembersQuerySchema', () => {
    it('rejects member roster limits above 100', () => {
      const result = listStudioMembersQuerySchema.safeParse({
        page: 1,
        limit: 101,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain('limit');
      }
    });
  });
});
