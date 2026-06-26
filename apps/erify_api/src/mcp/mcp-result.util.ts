import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { HttpException } from '@nestjs/common';
import { ZodError } from 'zod';

type ErrorPayload = {
  status?: number;
  message: string;
};

export function toJsonToolResult(data: unknown): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function toErrorToolResult(error: unknown): CallToolResult {
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: JSON.stringify(toErrorPayload(error), null, 2),
      },
    ],
  };
}

function toErrorPayload(error: unknown): ErrorPayload {
  if (error instanceof HttpException) {
    return {
      status: error.getStatus(),
      message: extractHttpMessage(error),
    };
  }

  if (error instanceof ZodError) {
    return {
      status: 400,
      message: error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
    };
  }

  return {
    status: 500,
    message: 'Internal MCP tool error',
  };
}

function extractHttpMessage(error: HttpException): string {
  const response = error.getResponse();
  if (typeof response === 'string') {
    return response;
  }

  if (
    response
    && typeof response === 'object'
    && 'message' in response
  ) {
    const message = response.message;
    if (Array.isArray(message)) {
      return message.join('; ');
    }

    if (typeof message === 'string') {
      return message;
    }
  }

  return error.message;
}
