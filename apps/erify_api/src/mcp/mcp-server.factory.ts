import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { toErrorToolResult, toJsonToolResult } from './mcp-result.util';
import { McpToolService, queryShowsShape, queryTasksShape } from './mcp-tool.service';

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

    server.registerTool(
      'erify_query_shows',
      {
        title: 'Query Studio Shows',
        description: 'Query shows for a studio. Accepts date_from and date_to as YYYY-MM-DD local operational dates (which resolve to local 06:00 to 05:59:59.999 next day) assuming UTC+7 timezone. Returns latest records first (reverse chronological order) by default.',
        inputSchema: queryShowsShape,
        annotations: {
          readOnlyHint: true,
          openWorldHint: false,
        },
      },
      (input) => this.callTool(() => this.tools.queryShows(input)),
    );

    server.registerTool(
      'erify_query_tasks',
      {
        title: 'Query Studio Tasks',
        description: 'Query tasks / submissions for a studio. Accepts completed_at_from/to and due_date_from/to as YYYY-MM-DD local calendar dates (which resolve to local 00:00:00 to 23:59:59.999) assuming UTC+7 timezone. Returns latest records first (reverse chronological order) by default.',
        inputSchema: queryTasksShape,
        annotations: {
          readOnlyHint: true,
          openWorldHint: false,
        },
      },
      (input) => this.callTool(() => this.tools.queryTasks(input)),
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
