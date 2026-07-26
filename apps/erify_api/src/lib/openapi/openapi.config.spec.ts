import type { INestApplication } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';

import { setupOpenAPI } from './openapi.config';

describe('setupOpenAPI', () => {
  it('creates the document and registers the JSON and Scalar routes', () => {
    const document = { openapi: '3.0.0' };
    const app = {
      use: jest.fn(),
    } as unknown as INestApplication;

    jest
      .spyOn(SwaggerModule, 'createDocument')
      .mockReturnValue(document as never);

    expect(setupOpenAPI(app)).toBe(document);
    expect(SwaggerModule.createDocument).toHaveBeenCalledWith(
      app,
      expect.objectContaining({
        info: expect.objectContaining({
          title: 'Eridu Services API',
          version: '1.0.0',
        }),
      }),
    );
    expect(app.use).toHaveBeenNthCalledWith(
      1,
      '/swagger-json',
      expect.any(Function),
    );
    expect(app.use).toHaveBeenNthCalledWith(
      2,
      '/api-reference',
      expect.any(Function),
    );
  });
});
