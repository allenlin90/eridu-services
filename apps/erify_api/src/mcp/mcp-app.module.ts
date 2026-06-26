import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';
import { LoggerModule } from 'nestjs-pino';

import { McpServerFactory } from './mcp-server.factory';
import { McpStudioPolicy } from './mcp-studio-policy';
import { McpToolService } from './mcp-tool.service';

import { Env, envSchema } from '@/config/env.schema';
import { TaskModule } from '@/models/task/task.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { TaskOrchestrationModule } from '@/task-orchestration/task-orchestration.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: (config: Record<string, unknown>) => {
        const result = envSchema.safeParse(config);
        if (!result.success) {
          const errorMessage = result.error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join('\n');
          throw new Error(`❌ Invalid environment variables:\n${errorMessage}`);
        }
        return result.data;
      },
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...(config.get('NODE_ENV') === 'development' && {
          pinoHttp: {
            transport: {
              target: 'pino-pretty',
              options: {
                colorize: true,
              },
            },
          },
        }),
      }),
    }),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
      plugins: [
        new ClsPluginTransactional({
          imports: [PrismaModule],
          adapter: new TransactionalAdapterPrisma({
            prismaInjectionToken: PrismaService,
          }),
        }),
      ],
    }),
    PrismaModule,
    TaskModule,
    TaskOrchestrationModule,
  ],
  providers: [
    {
      provide: McpStudioPolicy,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env>) =>
        new McpStudioPolicy(config.get('MCP_ALLOWED_STUDIO_IDS') ?? ''),
    },
    McpToolService,
    McpServerFactory,
  ],
})
export class McpAppModule {}
