import { PerformanceQueryDto, PnlQueryDto } from './studio-economics.schema';

import { McAvailabilityQueryDto } from '@/studios/studio-mc/schemas/studio-mc-availability.schema';

describe('studio date query dto openapi metadata', () => {
  it('builds OpenAPI metadata for economics query DTOs without date serialization errors', () => {
    expect(() =>
      (PnlQueryDto as unknown as { _OPENAPI_METADATA_FACTORY: () => unknown })._OPENAPI_METADATA_FACTORY()).not.toThrow();
    expect(() =>
      (PerformanceQueryDto as unknown as { _OPENAPI_METADATA_FACTORY: () => unknown })._OPENAPI_METADATA_FACTORY()).not.toThrow();
  });

  it('builds OpenAPI metadata for MC availability query DTO without date serialization errors', () => {
    expect(() =>
      (McAvailabilityQueryDto as unknown as { _OPENAPI_METADATA_FACTORY: () => unknown })._OPENAPI_METADATA_FACTORY()).not.toThrow();
  });
});
