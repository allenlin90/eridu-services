import {
  ConflictException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';

export const HttpError = {
  notFound(resource: string, identifier?: string | number): NotFoundException {
    const message = identifier
      ? `${resource} not found with id ${identifier}`
      : `${resource} not found`;
    return new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message });
  },

  conflict(message: string): ConflictException {
    return new ConflictException({ statusCode: HttpStatus.CONFLICT, message });
  },

  custom(message: string, status: HttpStatus): HttpException {
    return new HttpException({ statusCode: status, message }, status);
  },
} as const;

export type HttpErrorFactory = typeof HttpError;
