import {
  studioCreatorAvailabilityItemSchema,
  studioCreatorCatalogItemSchema,
  studioCreatorRosterItemSchema,
  studioShowCreatorListItemSchema,
} from '@eridu/api-types/studio-creators';
import { showSummaryCreatorSchema } from '@eridu/api-types/task-management';

import { showPlatformSummaryRelationSchema } from '@/models/show/schemas/show.schema';
import {
  AVAILABILITY_ITEM_ALLOWED_FOR_AM,
  CATALOG_ITEM_ALLOWED_FOR_AM,
  ROSTER_ITEM_ALLOWED_FOR_AM,
} from '@/studios/studio-creator/studio-creator.controller';
import {
  SHOW_CREATOR_LIST_ITEM_ALLOWED_FOR_AM,
  SHOW_CREATOR_SUMMARY_ALLOWED_FOR_AM,
  SHOW_PLATFORM_SUMMARY_ALLOWED_FOR_AM,
} from '@/studios/studio-show/studio-show.controller';

/**
 * Negative golden test for Finance Guardrails S3: every field name on these
 * response schemas that LOOKS like money (rate / commission / compensation /
 * gmv / ctr / cto) must be absent from the corresponding ACCOUNT_MANAGER
 * allow-list. This scans `schema.shape` directly rather than a hardcoded
 * field list, so it catches a new money field the moment it's added to the
 * schema — even before anyone remembers to update the controller.
 */
const MONEY_FIELD_PATTERN = /rate|commission|compensation|gmv|ctr|cto/i;

function moneyFieldsOf(shape: Record<string, unknown>): string[] {
  return Object.keys(shape).filter((key) => MONEY_FIELD_PATTERN.test(key));
}

describe('account-manager money redaction — negative golden test', () => {
  it.each([
    ['studioCreatorRosterItemSchema', studioCreatorRosterItemSchema, ROSTER_ITEM_ALLOWED_FOR_AM],
    ['studioCreatorCatalogItemSchema', studioCreatorCatalogItemSchema, CATALOG_ITEM_ALLOWED_FOR_AM],
    ['studioCreatorAvailabilityItemSchema', studioCreatorAvailabilityItemSchema, AVAILABILITY_ITEM_ALLOWED_FOR_AM],
    ['studioShowCreatorListItemSchema', studioShowCreatorListItemSchema, SHOW_CREATOR_LIST_ITEM_ALLOWED_FOR_AM],
    ['showSummaryCreatorSchema', showSummaryCreatorSchema, SHOW_CREATOR_SUMMARY_ALLOWED_FOR_AM],
    ['showPlatformSummaryRelationSchema', showPlatformSummaryRelationSchema, SHOW_PLATFORM_SUMMARY_ALLOWED_FOR_AM],
  ] as const)('%s has no money-bearing field in its ACCOUNT_MANAGER allow-list', (_name, schema, allowed) => {
    const moneyFields = moneyFieldsOf(schema.shape);
    expect(moneyFields.length).toBeGreaterThan(0); // sanity: the schema actually has money fields to guard

    for (const field of moneyFields) {
      expect(allowed.has(field)).toBe(false);
    }
  });

  it('the money-field detector itself matches the known field set (no detector drift)', () => {
    expect(moneyFieldsOf(studioCreatorRosterItemSchema.shape).sort()).toEqual(
      ['default_commission_rate', 'default_rate', 'default_rate_type'].sort(),
    );
    expect(moneyFieldsOf(showPlatformSummaryRelationSchema.shape).sort()).toEqual(
      ['gmv', 'ctr', 'cto'].sort(),
    );
    expect(moneyFieldsOf(showSummaryCreatorSchema.shape).sort()).toEqual(
      ['compensation_type', 'agreed_rate', 'commission_rate'].sort(),
    );
  });
});
