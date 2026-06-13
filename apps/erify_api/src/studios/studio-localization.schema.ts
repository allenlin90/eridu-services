import { z } from 'zod';

/**
 * Typed shape of a studio's `metadata.localization` JSONB. Both analytics
 * services read it to resolve the display `locale` / `currency`.
 */
export const studioLocalizationSchema = z.object({
  locale: z.string().optional(),
  currency: z.string().optional(),
});

export type StudioLocalization = z.infer<typeof studioLocalizationSchema>;

const studioLocalizationMetadataSchema = z
  .object({
    localization: studioLocalizationSchema.optional(),
  })
  .passthrough();

/**
 * Safely extracts the typed `localization` block from a studio's raw `metadata`
 * JSONB. This is a DB-read parse, not a request boundary: malformed or absent
 * metadata yields an empty object so the caller falls back to platform defaults
 * rather than throwing on every dashboard load. Replaces the prior
 * `as Record<string, any>` casts in the analytics services.
 */
export function parseStudioLocalization(metadata: unknown): StudioLocalization {
  const parsed = studioLocalizationMetadataSchema.safeParse(metadata);
  return parsed.success ? (parsed.data.localization ?? {}) : {};
}
