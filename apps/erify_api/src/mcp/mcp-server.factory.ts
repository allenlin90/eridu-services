import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Injectable } from '@nestjs/common';
import { TaskStatus, TaskType } from '@prisma/client';
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

    server.registerTool(
      'erify_query_shows',
      {
        title: 'Query Studio Shows',
        description: 'Query shows for a studio by date range, search terms, and filters.',
        inputSchema: {
          studio_id: z.string().describe('The Studio UID (e.g., std_abc123).'),
          date_from: z.string().optional().describe('ISO-8601 date-time string (e.g., 2026-06-01T00:00:00Z) to query shows starting after.'),
          date_to: z.string().optional().describe('ISO-8601 date-time string to query shows starting before.'),
          search: z.string().optional().describe('Optional search term to filter shows by name.'),
          needs_attention: z.boolean().optional().describe('Filter shows that need attention (e.g., has scheduling warnings).'),
          show_status_name: z.string().optional().describe('Filter shows by status name (e.g., Scheduled, Live, Ended).'),
          creator_name: z.string().optional().describe('Filter shows by creator name.'),
          page: z.number().optional().describe('Page number for pagination (starts at 1).'),
          limit: z.number().optional().describe('Maximum number of shows to return (default 50).'),
        },
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
        description: 'Query tasks / submissions for a studio by date ranges, status, type, and filters.',
        inputSchema: {
          studio_id: z.string().describe('The Studio UID (e.g., std_abc123).'),
          completed_at_from: z.string().optional().describe('ISO-8601 date-time string to query tasks completed after.'),
          completed_at_to: z.string().optional().describe('ISO-8601 date-time string to query tasks completed before.'),
          due_date_from: z.string().optional().describe('ISO-8601 date-time string to query tasks due after.'),
          due_date_to: z.string().optional().describe('ISO-8601 date-time string to query tasks due before.'),
          status: z.union([z.nativeEnum(TaskStatus), z.array(z.nativeEnum(TaskStatus))]).optional().describe('Filter by task status(es) (e.g., COMPLETED, PENDING, REVIEW).'),
          type: z.union([z.nativeEnum(TaskType), z.array(z.nativeEnum(TaskType))]).optional().describe('Filter by task type(s) (e.g., SETUP, ACTIVE, CLOSURE).'),
          page: z.number().optional().describe('Page number for pagination (starts at 1).'),
          limit: z.number().optional().describe('Maximum number of tasks to return (default 50).'),
        },
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
