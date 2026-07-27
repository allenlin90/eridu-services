import { describe, expect, it } from 'vitest';

import { sceneProfileSearchSchema } from '../scene-profile-search-schema';

describe('sceneProfileSearchSchema', () => {
  it('accepts a valid client_id', () => {
    const result = sceneProfileSearchSchema.parse({ client_id: 'client_abc123' });
    expect(result).toEqual({ client_id: 'client_abc123' });
  });

  it('catches an invalid client_id to undefined instead of throwing', () => {
    const result = sceneProfileSearchSchema.parse({ client_id: 'not-a-client-id' });
    expect(result.client_id).toBeUndefined();
  });

  it('defaults to an empty object when no search params are present', () => {
    const result = sceneProfileSearchSchema.parse({});
    expect(result).toEqual({ client_id: undefined });
  });
});
