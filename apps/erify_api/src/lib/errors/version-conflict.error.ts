/**
 * Custom error thrown when an optimistic locking version conflict is detected.
 *
 * This error is used in repository methods that implement optimistic locking to prevent
 * concurrent updates from overwriting each other's changes. When a version mismatch occurs,
 * this error provides detailed information about the conflict.
 *
 * @example
 * ```typescript
 * // In a repository method with optimistic locking
 * try {
 *   return await this.prisma.taskTemplate.update({
 *     where: { uid: 'ttpl_123', version: 5 }, // Version check in WHERE clause
 *     data: {
 *       name: 'Updated Name',
 *       version: 6 // Increment version
 *     }
 *   });
 * } catch (error) {
 *   if (error.code === 'P2025' && where.version !== undefined) {
 *     const existing = await this.findOne({ uid: where.uid });
 *
 *     if (existing) {
 *       // Version conflict - someone else updated the record
 *       throw new VersionConflictError(
 *         'Task template version is outdated',
 *         5,  // expectedVersion - what the client had
 *         7   // currentVersion - what's actually in the database
 *       );
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // In a service layer catching the error
 * try {
 *   return await this.repository.updateWithVersionCheck(where, data);
 * } catch (error) {
 *   if (error instanceof VersionConflictError) {
 *     throw HttpError.conflict(
 *       `Version conflict. Expected version ${error.expectedVersion}, ` +
 *       `but current version is ${error.currentVersion}`
 *     );
 *   }
 *   throw error;
 * }
 * ```
 *
 * ## Optimistic Locking Flow
 *
 * 1. **Client reads record**: Gets version 5
 * 2. **Client modifies data**: Prepares update with version 5
 * 3. **Client sends update**: Includes version 5 in the request
 * 4. **Server attempts update**: WHERE clause includes `version: 5`
 * 5. **Two scenarios**:
 *    - **Success**: Version matches → Update succeeds, version incremented to 6
 *    - **Conflict**: Version doesn't match (someone else updated to 6) → P2025 error
 * 6. **Error handling**: Disambiguate P2025 into 404 (not found) or 409 (conflict)
 *
 * ## Why Use This Pattern?
 *
 * - **Prevents lost updates**: User A's changes won't silently overwrite User B's changes
 * - **No database locks**: Better performance than pessimistic locking
 * - **Clear error messages**: Users know when their data is stale
 * - **ORM-agnostic**: Domain error not tied to Prisma
 *
 * @see {@link https://www.prisma.io/docs/guides/performance-and-optimization/prisma-client-transactions-guide#optimistic-concurrency-control Prisma Optimistic Locking}
 */
export class VersionConflictError extends Error {
  constructor(
    message: string,
    public readonly expectedVersion: number,
    public readonly currentVersion: number,
  ) {
    super(message);
    this.name = 'VersionConflictError';
  }
}
