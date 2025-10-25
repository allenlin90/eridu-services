/**
 * Base service class for orchestration services that coordinate multiple model services
 * for complex business operations.
 *
 * This class is designed for services that:
 * - Coordinate multiple domain services
 * - Handle cross-module operations
 * - Manage transactions across multiple entities
 * - Implement complex business workflows
 *
 * Orchestration services typically don't need UID generation as they work with
 * existing entities, but they may need common utilities for validation,
 * transaction management, and cross-service coordination.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class ExampleOrchestrationService extends BaseOrchestrationService {
 *   constructor(
 *     private readonly entityService: EntityService,
 *     private readonly relatedService: RelatedService,
 *     private readonly prismaService: PrismaService,
 *   ) {
 *     super();
 *   }
 * }
 * ```
 */
export abstract class BaseOrchestrationService {
  constructor() {
    // Orchestration services typically don't need utility service injection
    // as they coordinate other services rather than generating UIDs
  }

  /**
   * Common method for validating entity existence across services.
   * Can be overridden by specific orchestration services for custom validation logic.
   *
   * @param entityType - The type of entity being validated
   * @param uid - The UID of the entity to validate
   * @param service - The service to use for validation
   * @returns Promise<boolean> - Whether the entity exists
   */
  protected async validateEntityExists<T>(
    entityType: string,
    uid: string,
    service: { getById: (uid: string) => Promise<T | null> },
  ): Promise<boolean> {
    const entity = await service.getById(uid);
    if (!entity) {
      throw new Error(`${entityType} with UID '${uid}' not found`);
    }
    return true;
  }

  /**
   * Common method for handling transaction rollback with proper error logging.
   * Can be used by orchestration services for consistent error handling.
   *
   * @param error - The error that occurred
   * @param operation - Description of the operation that failed
   */
  protected handleTransactionError(error: Error, operation: string): never {
    console.error(`Transaction failed during ${operation}:`, error);
    throw new Error(`Failed to complete ${operation}: ${error.message}`);
  }
}
