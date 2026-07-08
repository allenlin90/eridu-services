import { z } from 'zod';

import { booleanQueryParamSchema } from '@eridu/api-types/pagination';

describe('booleanQueryParamSchema', () => {
  const schema = z.object({
    flag: booleanQueryParamSchema.default(false),
  });

  it.each([
    ['true', true],
    ['false', false],
    [true, true],
    [false, false],
    [undefined, false],
  ])('parses %p as %p', (input, expected) => {
    expect(schema.parse({ flag: input }).flag).toBe(expected);
  });

  it('rejects non-boolean strings instead of relying on JavaScript truthiness', () => {
    expect(schema.safeParse({ flag: '0' }).success).toBe(false);
    expect(schema.safeParse({ flag: 'no' }).success).toBe(false);
  });
});
