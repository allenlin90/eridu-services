import type { Server } from 'node:http';

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { json, urlencoded } from 'express';
import { Logger } from 'nestjs-pino';

import type { Env } from './config/env.schema';
import { McpAppModule } from './mcp/mcp-app.module';
import { McpServerFactory } from './mcp/mcp-server.factory';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(McpAppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  const configService = app.get<ConfigService<Env>>(ConfigService);
  const bodyLimit = configService.getOrThrow('BODY_PARSER_LIMIT');
  const logger = app.get(Logger);

  app.set('trust proxy', 1);
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));
  app.useLogger(logger);
  app.enableShutdownHooks();

  const expressApp = app.getHttpAdapter().getInstance();
  const serverFactory = app.get(McpServerFactory);

  expressApp.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'erify_api_mcp',
    });
  });

  expressApp.get('/health/ready', (_req: Request, res: Response) => {
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      service: 'erify_api_mcp',
    });
  });

  // TODO(mcp-auth): Keep this route private for the OpenWebUI Railway integration.
  // Future public/partner MCP access should use a separate authenticated surface.
  expressApp.post('/mcp', async (req: Request, res: Response) => {
    const mcpServer = serverFactory.createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on('close', () => {
      void transport.close();
      void mcpServer.close();
    });

    try {
      await mcpServer.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      logger.error('Error handling MCP request', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  expressApp.get('/mcp', (_req: Request, res: Response) => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Method not allowed.',
      },
      id: null,
    });
  });

  expressApp.delete('/mcp', (_req: Request, res: Response) => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Method not allowed.',
      },
      id: null,
    });
  });

  const port = configService.getOrThrow('PORT');
  const server = (await app.listen(port, '::')) as Server;
  logger.log(`MCP server is running on: http://localhost:${port}/mcp`);

  const shutdownTimeout = configService.getOrThrow('SHUTDOWN_TIMEOUT');
  let isShuttingDown = false;

  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) {
      logger.warn(`${signal} received again, forcing exit...`);
      process.exit(1);
    }

    isShuttingDown = true;
    logger.log(`${signal} received, starting MCP graceful shutdown...`);

    server.close(() => {
      logger.log('MCP HTTP server closed, no longer accepting new connections');
    });

    const shutdownTimer = setTimeout(() => {
      logger.error('MCP graceful shutdown timeout reached, forcing exit...');
      process.exit(1);
    }, shutdownTimeout);

    try {
      await app.close();
      clearTimeout(shutdownTimer);
      logger.log('MCP graceful shutdown completed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during MCP graceful shutdown', error);
      clearTimeout(shutdownTimer);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
}

void bootstrap();
