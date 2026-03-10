import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/**
 * Validates that a UID parameter starts with the expected prefix.
 * Used for path parameters like `:uid` in controllers.
 *
 * @example
 * ```typescript
 * @Get(':uid')
 * getUser(@Param('uid', new UidValidationPipe('user', 'User')) uid: string) {
 *   return this.userService.getUserById(uid);
 * }
 * ```
 */
@Injectable()
export class UidValidationPipe implements PipeTransform<string, string> {
  constructor(
    private readonly expectedPrefix: string | readonly string[],
    private readonly modelName: string,
  ) {}

  transform(value: string): string {
    if (!value) {
      throw new BadRequestException({
        statusCode: 400,
        message: `${this.modelName} ID is required`,
      });
    }

    const normalizedPrefixes = (Array.isArray(this.expectedPrefix)
      ? this.expectedPrefix
      : [this.expectedPrefix]).map((prefix) =>
      prefix.endsWith('_') ? prefix : `${prefix}_`,
    );

    const matchedPrefix = normalizedPrefixes.find((prefix) =>
      value.startsWith(prefix),
    );
    if (!matchedPrefix) {
      throw new BadRequestException({
        statusCode: 400,
        message: `Invalid ${this.modelName} ID`,
      });
    }

    // Basic validation: ensure there's content after the prefix
    const contentAfterPrefix = value.substring(matchedPrefix.length);
    if (!contentAfterPrefix) {
      throw new BadRequestException({
        statusCode: 400,
        message: `Invalid ${this.modelName} ID`,
      });
    }

    return value;
  }
}
