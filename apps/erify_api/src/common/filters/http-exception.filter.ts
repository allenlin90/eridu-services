import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ZodSerializationException } from 'nestjs-zod';
import { ZodError } from 'zod';

@Catch(HttpException)
export class HttpExceptionFilter extends BaseExceptionFilter {
  constructor(
    @InjectPinoLogger(HttpExceptionFilter.name)
    private readonly logger: PinoLogger,
  ) {
    super();
  }

  catch(exception: HttpException, host: ArgumentsHost) {
    if (exception instanceof ZodSerializationException) {
      const zodError = exception.getZodError();
      if (zodError instanceof ZodError) {
        this.logger.error(`ZodSerializationException: ${zodError.message}`);
      }
    }

    super.catch(exception, host);
  }
}
