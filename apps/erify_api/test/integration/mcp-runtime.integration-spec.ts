import 'reflect-metadata';

import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { McpAppModule } from '@/mcp/mcp-app.module';
import { McpServerFactory } from '@/mcp/mcp-server.factory';
import { McpToolService } from '@/mcp/mcp-tool.service';

type ExpressRouteLayer = {
  route?: {
    path?: string | string[];
  };
};

type ExpressApplicationWithRouter = {
  router?: {
    stack?: ExpressRouteLayer[];
  };
};

describe('MCP runtime module graph', () => {
  let moduleRef: TestingModule;
  let app: INestApplication;

  afterEach(async () => {
    if (app) {
      await app.close();
    } else {
      await moduleRef?.close();
    }
  });

  it('boots with the real Prisma and CLS providers without REST controllers', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [McpAppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    const expressApp = app
      .getHttpAdapter()
      .getInstance() as ExpressApplicationWithRouter;
    const controllerRoutes = (expressApp.router?.stack ?? [])
      .flatMap((layer) => {
        const path = layer.route?.path;
        return Array.isArray(path) ? path : path ? [path] : [];
      })
      // Nest registers its not-found and error fallbacks as catch-all routes.
      .filter((path) => path !== '/{*path}');

    expect(app.get(McpToolService)).toBeInstanceOf(McpToolService);
    expect(app.get(McpServerFactory)).toBeInstanceOf(McpServerFactory);
    expect(controllerRoutes).toEqual([]);
  });
});
