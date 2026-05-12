import { Prisma } from '@prisma/client';

export type SnapshotChange = {
  field: string;
  old_value: any;
  new_value: any;
};

/**
 * Appends snapshot audit entries to the metadata object.
 * Each changed field results in a separate entry in metadata.audit.snapshot_overrides[].
 *
 * @param metadata Existing metadata object
 * @param changes List of field changes to audit
 * @param actorExtId External ID of the user performing the change
 * @param reason Optional reason for the override
 */
export function appendSnapshotAudit(
  metadata: any,
  changes: SnapshotChange[],
  actorExtId: string,
  reason?: string,
): any {
  if (changes.length === 0) {
    return metadata;
  }

  const at = new Date().toISOString();
  const newEntries = changes.map((c) => ({
    field: c.field,
    old_value: formatValue(c.old_value),
    new_value: formatValue(c.new_value),
    actor_ext_id: actorExtId,
    at,
    reason: reason ?? null,
  }));

  const currentMetadata = metadata || {};
  const currentAudit = currentMetadata.audit || {};
  const currentOverrides = currentAudit.snapshot_overrides || [];

  return {
    ...currentMetadata,
    audit: {
      ...currentAudit,
      snapshot_overrides: [...currentOverrides, ...newEntries],
    },
  };
}

/**
 * Compares two values for equality, handling Prisma.Decimal.
 */
export function isSnapshotValueEqual(a: any, b: any): boolean {
  if (a === b) {
    return true;
  }

  // Handle null/undefined comparison
  if (a == null || b == null) {
    return a === b;
  }

  // Handle Prisma.Decimal
  if (a instanceof Prisma.Decimal || b instanceof Prisma.Decimal) {
    try {
      const decA = a instanceof Prisma.Decimal ? a : new Prisma.Decimal(a);
      const decB = b instanceof Prisma.Decimal ? b : new Prisma.Decimal(b);
      return decA.equals(decB);
    } catch {
      return false;
    }
  }

  // Handle Date
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  return false;
}

function formatValue(value: any): any {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Prisma.Decimal) {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  return value;
}
