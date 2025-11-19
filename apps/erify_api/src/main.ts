import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { Server } from 'http';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { setupOpenAPI } from './lib/openapi/openapi.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://cdnjs.cloudflare.com',
            'https://unpkg.com',
            'https://cdn.jsdelivr.net',
          ],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            'https://cdnjs.cloudflare.com',
            'https://unpkg.com',
            'https://cdn.jsdelivr.net',
          ],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: [
            "'self'",
            'https://cdnjs.cloudflare.com',
            'https://fonts.scalar.com',
          ],
        },
      },
    }),
  );
  app.enableCors();

  // Setup OpenAPI documentation
  setupOpenAPI(app);

  // Enable graceful shutdown with timeout
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  const server = (await app.listen(port)) as Server;

  const logger = app.get(Logger);
  logger.log(`🚀 Application is running on: http://localhost:${port}`);

  // Graceful shutdown configuration
  const SHUTDOWN_TIMEOUT = parseInt(
    process.env.SHUTDOWN_TIMEOUT || '30000',
    10,
  ); // 30 seconds default

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
