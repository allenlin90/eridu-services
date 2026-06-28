import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { toErrorToolResult, toJsonToolResult } from './mcp-result.util';
import { McpToolService } from './mcp-tool.service';

@Injectable()
export class McpServerFactory {
  constructor(private readonly tools: McpToolService) {}

  createServer(): McpServer {
    const server = new McpServer(
      {
        name: 'erify-api-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    server.registerTool(
      'erify_get_show',
      {
        title: 'Get Studio Show',
        description: 'Load a studio-scoped show by UID.',
        inputSchema: {
          studio_id: z.string(),
          show_id: z.string(),
        },
        annotations: {
          readOnlyHint: true,
          openWorldHint: false,
        },
      },
      (input) => this.callTool(() => this.tools.getShow(input)),
    );

    server.registerTool(
      'erify_get_task',
      {
        title: 'Get Studio Task',
        description: 'Load a studio-scoped task by UID.',
        inputSchema: {
          studio_id: z.string(),
          task_id: z.string(),
        },
        annotations: {
          readOnlyHint: true,
          openWorldHint: false,
        },
      },
      (input) => this.callTool(() => this.tools.getTask(input)),
    );

    return server;
  }

  private async callTool(callback: () => Promise<unknown>): Promise<CallToolResult> {
    try {
      return toJsonToolResult(await callback());
    } catch (error) {
      return toErrorToolResult(error);
    }
  }
}
