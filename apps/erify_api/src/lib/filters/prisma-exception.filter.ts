import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { PRISMA_ERROR } from '@/lib/errors/prisma-error-codes';

/**
 * Global exception filter for Prisma errors.
 * Converts Prisma-specific errors into appropriate HTTP responses.
 *
 * Handles:
 * - P2002: Unique constraint violations → 409 Conflict
 * - P2025: Record not found → 404 Not Found
 * - Other known errors → 400 Bad Request with details
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter
  implements ExceptionFilter<Prisma.PrismaClientKnownRequestError>
{
  constructor(
    @InjectPinoLogger(PrismaExceptionFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    switch (exception.code) {
      case PRISMA_ERROR.UniqueConstraint:
        return this.handleUniqueConstraintViolation(exception, response);

      case PRISMA_ERROR.RecordNotFound:
        return this.handleRecordNotFound(exception, response);

      default:
        return this.handleUnknownPrismaError(exception, response);
    }
  }

  private handleUniqueConstraintViolation(
    exception: Prisma.PrismaClientKnownRequestError,
    response: Response,
  ) {
    const meta = exception.meta as { target?: string[]; modelName?: string };
    const fields = meta?.target || [];
    const modelName = meta?.modelName;

    this.logger.warn(
      `Unique constraint violation on ${fields.join(', ')}: ${exception.message}`,
    );

    // Generate context-aware error message
    const message = this.getUniqueConstraintMessage(fields, modelName);

    return response.status(HttpStatus.CONFLICT).json({
      statusCode: HttpStatus.CONFLICT,
      message,
      error: 'Conflict',
      details: fields.length > 0 ? { fields } : undefined,
    });
  }

  private getUniqueConstraintMessage(
    fields: string[],
    modelName?: string,
  ): string {
    // Common field-specific messages
    if (fields.includes('email')) {
      return 'This email address is already in use';
    }

    if (fields.includes('uid')) {
      return 'A record with this ID already exists';
    }

    // Composite unique constraints (e.g., show + mc, show + platform)
    if (fields.includes('showId') && fields.includes('mcId')) {
      return 'This MC is already assigned to this show';
    }

    if (fields.includes('showId') && fields.includes('platformId')) {
      return 'This platform is already linked to this show';
    }

    if (fields.includes('userId') && fields.includes('studioId')) {
      return 'This user is already a member of this studio';
    }

    if (fields.includes('studioId') && fields.includes('name')) {
      return 'A room with this name already exists in this studio';
    }

    // Generic message with field names
    if (fields.length > 0) {
      const fieldList = fields.join(', ');
      return `A record with the same ${fieldList} already exists`;
    }

    // Fallback
    return modelName
      ? `A ${modelName} with these values already exists`
      : 'A record with these values already exists';
  }

  private handleRecordNotFound(
    exception: Prisma.PrismaClientKnownRequestError,
    response: Response,
  ) {
    const meta = exception.meta as {
      modelName?: string;
      cause?: string;
      // Prisma sometimes includes this but not always
      target?: string;
    };

    const modelName = meta?.modelName;
    const cause = meta?.cause;

    // Try to extract the actual missing model from available metadata
    const missingModel = this.extractMissingModel(meta);
    const actualModel = missingModel || modelName;

    this.logger.warn(
      `Record not found: ${actualModel || 'Unknown'} - Cause: ${cause || 'N/A'}`,
    );

    // Generate context-aware error message
    const message = this.getRecordNotFoundMessage(
      actualModel,
      cause,
      modelName,
    );

    return response.status(HttpStatus.NOT_FOUND).json({
      statusCode: HttpStatus.NOT_FOUND,
      message,
      error: 'Not Found',
      details: actualModel ? { model: actualModel } : undefined,
    });
  }

  /**
   * Extracts the actual missing model from Prisma's error metadata.
   *
   * NOTE: This is a workaround for Prisma's limitation where relation errors
   * only provide the operation model, not the missing related model.
   *
   * Strategies (in order of preference):
   * 1. Check for relation name pattern (e.g., "MCToUser" → "User")
   * 2. Parse cause message for quoted model name
   * 3. Fall back to provided modelName
   *
   * @see https://github.com/prisma/prisma/issues/XXX (Prisma should provide this in meta)
   */
  private extractMissingModel(meta: {
    modelName?: string;
    cause?: string;
    target?: string;
  }): string | undefined {
    const { cause, modelName } = meta;

    if (!cause) return undefined;

    // Strategy 1: Extract from relation name pattern
    // Example: "relation 'MCToUser'" → "User" (the related model)
    // This is more reliable than parsing the full error message
    const relationMatch = cause.match(/relation '(\w+To(\w+))'/);
    if (relationMatch) {
      const [, , relatedModel] = relationMatch;
      if (relatedModel && relatedModel !== modelName) {
        return relatedModel;
      }
    }

    // Strategy 2: Extract from quoted model in error message
    // Example: "No 'User' record" → "User"
    const modelMatch = cause.match(/No '(\w+)' record/);
    if (modelMatch) {
      const [, extractedModel] = modelMatch;
      return extractedModel;
    }

    // Strategy 3: No extraction possible, return undefined
    // Caller will fall back to modelName
    return undefined;
  }

  private getRecordNotFoundMessage(
    actualModel?: string,
    cause?: string,
    _operationModel?: string,
  ): string {
    // Model-specific messages
    const modelMessages: Record<string, string> = {
      User: 'User not found',
      Client: 'Client not found',
      MC: 'MC not found',
      Show: 'Show not found',
      ShowMC: 'Show MC assignment not found',
      ShowPlatform: 'Show platform assignment not found',
      Studio: 'Studio not found',
      StudioRoom: 'Studio room not found',
      StudioMembership: 'Studio membership not found',
      Platform: 'Platform not found',
      ShowType: 'Show type not found',
      ShowStatus: 'Show status not found',
      ShowStandard: 'Show standard not found',
    };

    // Check if this is a relation/connect error (missing related record)
    if (cause?.includes('needed to create or connect') && actualModel) {
      return modelMessages[actualModel] || `${actualModel} not found`;
    }

    // Direct model lookup (e.g., GET /users/uid_123)
    if (actualModel && modelMessages[actualModel]) {
      return modelMessages[actualModel];
    }

    // Operation-specific messages based on cause
    if (cause?.includes('delete')) {
      return actualModel
        ? `Cannot delete: ${actualModel} not found`
        : 'Cannot delete: Record not found';
    }

    if (cause?.includes('update')) {
      return actualModel
        ? `Cannot update: ${actualModel} not found`
        : 'Cannot update: Record not found';
    }

    // Generic fallback
    return actualModel
      ? `${actualModel} not found`
      : 'The requested resource was not found';
  }

  private handleUnknownPrismaError(
    exception: Prisma.PrismaClientKnownRequestError,
    response: Response,
  ) {
    this.logger.error(
      `Unhandled Prisma error (${exception.code}): ${exception.message}`,
    );

    return response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'A database error occurred',
      error: 'Bad Request',
      code: exception.code,
    });
  }
}
