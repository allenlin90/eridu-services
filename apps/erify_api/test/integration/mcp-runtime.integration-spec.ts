import 'reflect-metadata';

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { McpAppModule } from '@/mcp/mcp-app.module';
import { McpServerFactory } from '@/mcp/mcp-server.factory';
import { McpToolService } from '@/mcp/mcp-tool.service';

describe('MCP runtime module graph', () => {
  let moduleRef: TestingModule;

  afterEach(async () => {
    await moduleRef?.close();
  });

  it('boots with the real Prisma and CLS providers', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [McpAppModule],
    }).compile();

    await moduleRef.init();

    expect(moduleRef.get(McpToolService)).toBeInstanceOf(McpToolService);
    expect(moduleRef.get(McpServerFactory)).toBeInstanceOf(McpServerFactory);
  });
});
