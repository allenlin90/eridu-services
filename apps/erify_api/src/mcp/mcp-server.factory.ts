import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Injectable } from '@nestjs/common';
import { TaskStatus, TaskType } from '@prisma/client';
import { z } from 'zod';

import { toErrorToolResult, toJsonToolResult } from './mcp-result.util';
import { McpToolService, queryShowsShape } from './mcp-tool.service';

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
        description: 'Query shows for a studio. For natural language dates like "today", prefer date_preset or operational_date so the server applies the studio operational day (default GMT+7, 06:00 to 05:59:59.999 next day). Use explicit ISO date_from/date_to only when the user provides exact boundaries. Returns latest records first (reverse chronological order) by default.',
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
        description: 'Query tasks / submissions for a studio. ALWAYS prioritize providing a completed_at_from and completed_at_to date range to narrow down submissions. Returns latest records first (reverse chronological order) by default.',
        inputSchema: {
          studio_id: z.string().describe('The Studio UID (e.g., std_abc123).'),
          completed_at_from: z.string().optional().describe('ISO-8601 date-time string (e.g., 2026-06-28T00:00:00+07:00). When user asks for relative dates (e.g., "today"), look at the user current time/timezone in their system prompt context (e.g., UTC+7), and calculate the start boundary of that day to convert to an ISO string before querying.'),
          completed_at_to: z.string().optional().describe('ISO-8601 date-time string. Calculate the end boundary of the target relative day (e.g., 2026-06-28T23:59:59+07:00) using the user local timezone before querying.'),
          due_date_from: z.string().optional().describe('ISO-8601 date-time string to query tasks due after.'),
          due_date_to: z.string().optional().describe('ISO-8601 date-time string to query tasks due before.'),
          status: z.union([z.nativeEnum(TaskStatus), z.array(z.nativeEnum(TaskStatus))]).optional().describe('Filter by task status(es) (e.g., COMPLETED, PENDING, REVIEW).'),
          type: z.union([z.nativeEnum(TaskType), z.array(z.nativeEnum(TaskType))]).optional().describe('Filter by task type(s) (e.g., SETUP, ACTIVE, CLOSURE).'),
          page: z.number().optional().describe('Page number for pagination (starts at 1).'),
          limit: z.number().optional().describe('Maximum number of tasks to return (default 20).'),
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
