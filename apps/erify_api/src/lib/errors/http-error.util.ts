import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';

export const HttpError = {
  notFound(resource: string, identifier?: string | number): NotFoundException {
    const message = identifier
      ? `${resource} not found with id ${identifier}`
      : `${resource} not found`;
    return new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message });
  },

  badRequest(message: string): BadRequestException {
    return new BadRequestException({
      statusCode: HttpStatus.BAD_REQUEST,
      message,
    });
  },

  badRequestWithDetails(
    message: string,
    details?: object,
  ): BadRequestException {
    return new BadRequestException({
      statusCode: HttpStatus.BAD_REQUEST,
      message,
      ...(details && { details }),
    });
  },

  unauthorized(message: string): UnauthorizedException {
    return new UnauthorizedException({
      statusCode: HttpStatus.UNAUTHORIZED,
      message,
    });
  },

  forbidden(message: string): ForbiddenException {
    return new ForbiddenException({
      statusCode: HttpStatus.FORBIDDEN,
      message,
    });
  },

  conflict(message: string): ConflictException {
    return new ConflictException({ statusCode: HttpStatus.CONFLICT, message });
  },

  unprocessableEntity(message: string): UnprocessableEntityException {
    return new UnprocessableEntityException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      message,
    });
  },

  internalServerError(message: string): InternalServerErrorException {
    return new InternalServerErrorException({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message,
    });
  },

  custom(message: string, status: HttpStatus): HttpException {
    return new HttpException({ statusCode: status, message }, status);
  },
} as const;

export type HttpErrorFactory = typeof HttpError;
