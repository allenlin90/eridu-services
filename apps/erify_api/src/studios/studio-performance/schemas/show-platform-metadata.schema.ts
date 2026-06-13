import { z } from 'zod';

/**
 * Typed view of a `ShowPlatform.metadata` JSONB, scoped to what the performance
 * read paths consume: the `performance_templates` map (system-fact-key →
 * template id). Template values are only ever checked for presence here, so
 * they stay `unknown` rather than over-constraining the shape.
 */
export const showPlatformMetadataSchema = z
  .object({
    performance_templates: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export type PerformanceTemplates = Record<string, unknown>;

/**
 * Safely extracts the `performance_templates` map from a `ShowPlatform.metadata`
 * JSONB. DB-read parse (not a request boundary): malformed or absent metadata
 * yields an empty map, so a `show_platform_view_count` presence check reads as
 * "no record" instead of throwing. Replaces the prior `as Record<string, any>`
 * casts in the performance service/calculator.
 */
export function parsePerformanceTemplates(metadata: unknown): PerformanceTemplates {
  const parsed = showPlatformMetadataSchema.safeParse(metadata);
  return parsed.success ? (parsed.data.performance_templates ?? {}) : {};
}
