import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';
import { LoggerModule } from 'nestjs-pino';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';

import { AdminModule } from '@/admin/admin.module';
import { BackdoorModule } from '@/backdoor/backdoor.module';
import { Env, envSchema } from '@/config/env.schema';
import { GoogleSheetsModule } from '@/google-sheets/google-sheets.module';
import { HealthModule } from '@/health/health.module';
import { AuthModule } from '@/lib/auth/auth.module';
import { JwtAuthGuard } from '@/lib/auth/jwt-auth.guard';
import { HttpExceptionFilter } from '@/lib/filters/http-exception.filter';
import { PrismaExceptionFilter } from '@/lib/filters/prisma-exception.filter';
import { ZodExceptionFilter } from '@/lib/filters/zod-exception.filter';
import { AdminGuard } from '@/lib/guards/admin.guard';
import { AppThrottlerGuard } from '@/lib/guards/app-throttler.guard';
import { BackdoorApiKeyGuard } from '@/lib/guards/backdoor-api-key.guard';
import { GoogleSheetsApiKeyGuard } from '@/lib/guards/google-sheets-api-key.guard';
import { READ_BURST_THROTTLE_KEY } from '@/lib/guards/read-burst-throttle.decorator';
import { StudioGuard } from '@/lib/guards/studio.guard';
import { OpenAPIModule } from '@/lib/openapi/openapi.module';
import { MeModule } from '@/me/me.module';
import { UserModule } from '@/models/user/user.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { StudiosModule } from '@/studios/studios.module';
import { UploadModule } from '@/uploads/upload.module';

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
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env>) => {
        const isDevelopment = config.get('NODE_ENV') === 'development';

        if (isDevelopment) {
          return [];
        }

        return [
          {
            name: 'default',
            ttl: config.getOrThrow('THROTTLE_TTL'),
            limit: config.getOrThrow('THROTTLE_LIMIT'),
          },
          {
            name: 'readBurst',
            ttl: config.getOrThrow('THROTTLE_READ_BURST_TTL'),
            limit: config.getOrThrow('THROTTLE_READ_BURST_LIMIT'),
            skipIf: (context) => {
              const handlerEnabled = Reflect.getMetadata(
                READ_BURST_THROTTLE_KEY,
                context.getHandler(),
              );
              const classEnabled = Reflect.getMetadata(
                READ_BURST_THROTTLE_KEY,
                context.getClass(),
              );

              return !(handlerEnabled || classEnabled);
            },
          },
        ];
      },
    }),
    AdminModule,
    AuthModule,
    BackdoorModule,
    GoogleSheetsModule,
    HealthModule,
    UserModule,
    MeModule,
    StudiosModule,
    UploadModule,
    OpenAPIModule.forRoot(),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: BackdoorApiKeyGuard,
    },
    {
      provide: APP_GUARD,
      useClass: GoogleSheetsApiKeyGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AdminGuard,
    },
    {
      provide: APP_GUARD,
      useClass: StudioGuard,
    },
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: ZodExceptionFilter,
    },
  ],
})
export class AppModule {}
