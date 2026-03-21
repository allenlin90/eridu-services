import { updateSharedFieldSchema } from '@eridu/api-types/task-management';

describe('studioSharedFieldSchemas', () => {
  describe('updateSharedFieldSchema', () => {
    it('accepts mutable properties only', () => {
      const parsed = updateSharedFieldSchema.parse({
        label: 'GMV',
        description: 'Gross Merchandise Value',
        is_active: true,
      });

      expect(parsed).toEqual({
        label: 'GMV',
        description: 'Gross Merchandise Value',
        is_active: true,
      });
    });

    it('rejects immutable properties in update payload', () => {
      const result = updateSharedFieldSchema.safeParse({
        label: 'GMV',
        key: 'gmv',
        type: 'number',
        category: 'metric',
      });

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.issues.some((issue) => issue.code === 'unrecognized_keys')).toBe(true);
    });
  });
});
