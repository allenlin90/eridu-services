import type { Server } from 'node:http';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import type { Env } from './config/env.schema';
import { setupOpenAPI } from './lib/openapi/openapi.config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  const configService = app.get<ConfigService<Env>>(ConfigService);
  const bodyLimit = configService.getOrThrow('BODY_PARSER_LIMIT');
  // Trust one proxy hop (ingress / load balancer) for accurate req.ip.
  // Using `1` instead of `true` prevents X-Forwarded-For spoofing through extra hops.
  app.set('trust proxy', 1);
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));
  app.useLogger(app.get(Logger));
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ['\'self\''],
          styleSrc: [
            '\'self\'',
            '\'unsafe-inline\'',
            'https://cdnjs.cloudflare.com',
            'https://unpkg.com',
            'https://cdn.jsdelivr.net',
          ],
          scriptSrc: [
            '\'self\'',
            '\'unsafe-inline\'',
            '\'unsafe-eval\'',
            'https://cdnjs.cloudflare.com',
            'https://unpkg.com',
            'https://cdn.jsdelivr.net',
          ],
          imgSrc: ['\'self\'', 'data:', 'https:'],
          connectSrc: ['\'self\''],
          fontSrc: [
            '\'self\'',
            'https://cdnjs.cloudflare.com',
            'https://fonts.scalar.com',
          ],
        },
      },
    }),
  );
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Setup OpenAPI documentation
  setupOpenAPI(app);

  // Enable graceful shutdown with timeout
  app.enableShutdownHooks();

  const port = configService.getOrThrow('PORT');
  const server = (await app.listen(port, '::')) as Server;

  const logger = app.get(Logger);
  logger.log(`🚀 Application is running on: http://localhost:${port}`);

  // Graceful shutdown configuration
  const SHUTDOWN_TIMEOUT = configService.getOrThrow('SHUTDOWN_TIMEOUT');

  let isShuttingDown = false;

  // Prevent new connections during shutdown
  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) {
      logger.warn(`${signal} received again, forcing exit...`);
      process.exit(1);
    }

    isShuttingDown = true;
    logger.log(`${signal} received, starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(() => {
      logger.log('HTTP server closed, no longer accepting new connections');
    });

    // Set timeout for graceful shutdown
    const shutdownTimer = setTimeout(() => {
      logger.error('Graceful shutdown timeout reached, forcing exit...');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT);

    try {
      // Close the application (this will trigger OnModuleDestroy hooks)
      await app.close();
      clearTimeout(shutdownTimer);
      logger.log('Graceful shutdown completed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      clearTimeout(shutdownTimer);
      process.exit(1);
    }
  };

  // Handle graceful shutdown signals
  process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    void gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    void gracefulShutdown('UNHANDLED_REJECTION');
  });
}

void bootstrap();
