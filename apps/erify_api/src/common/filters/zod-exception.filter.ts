import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ZodSerializationException } from 'nestjs-zod';
import { ZodError } from 'zod';

@Catch(ZodError, ZodSerializationException)
export class ZodExceptionFilter
  implements ExceptionFilter<ZodError | ZodSerializationException>
{
  catch(exception: ZodError | ZodSerializationException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Handle ZodSerializationException
    if (exception instanceof ZodSerializationException) {
      const zodError = exception.getZodError();
      if (zodError instanceof ZodError) {
        const issues = zodError.issues.map((issue) => {
          const baseIssue = {
            path: issue.path.join('.'),
            code: issue.code,
            message: issue.message,
          };
          // Add expected/received only if they exist on the issue
          if ('expected' in issue && 'received' in issue) {
            return {
              ...baseIssue,
              expected: issue.expected,
              received: issue.received,
            };
          }
          return baseIssue;
        });

        return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Serialization failed',
          errors: issues,
        });
      }
    }

    // Handle regular ZodError
    if (exception instanceof ZodError) {
      const issues = exception.issues.map((issue) => ({
        path: issue.path.join('.'),
        code: issue.code,
        message: issue.message,
      }));

      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        errors: issues,
      });
    }

    // Fallback - should not reach here, but TypeScript needs it
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Unknown error',
    });
  }
}
