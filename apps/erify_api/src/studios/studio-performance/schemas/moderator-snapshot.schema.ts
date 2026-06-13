import { z } from 'zod';

/**
 * A single field item in a task's moderator-snapshot schema. Legacy snapshots
 * omit `shared_field_key` / `system_fact_key` and suffix the loop onto `key`
 * (e.g. `gmv_l1`), so every key is optional. Values are matched only as
 * strings, so non-string fields are dropped to `undefined` rather than kept.
 */
export const snapshotFieldItemSchema = z
  .object({
    id: z.string().optional(),
    group: z.string().optional(),
    key: z.string().optional(),
    shared_field_key: z.string().optional(),
    system_fact_key: z.string().optional(),
  })
  .passthrough();

export type SnapshotFieldItem = z.infer<typeof snapshotFieldItemSchema>;

/**
 * A loop definition from `snapshot.schema.metadata.loops`. `id` / `name` feed
 * the response contract (strings); `durationMin` stays loose because the
 * consumer coerces it via `Number(...) || default`.
 */
export const snapshotLoopSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    durationMin: z.unknown().optional(),
  })
  .passthrough();

export type SnapshotLoop = z.infer<typeof snapshotLoopSchema>;

/** A task's content map: snapshot-field-id (or `${id}:platform:${uid}`) → value. */
export type TaskContent = Record<string, unknown>;

export type ParsedModeratorSnapshot = {
  /** Field items, or `[]` when the snapshot omits a valid `items` array. */
  items: SnapshotFieldItem[];
  /**
   * Loop definitions, or `null` when `metadata.loops` is not an array — lets the
   * caller distinguish "not a loop-bearing snapshot" from "an empty loop list",
   * preserving the original `Array.isArray(schema.metadata.loops)` gate.
   */
  loops: SnapshotLoop[] | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Leniently parses a task's `snapshot.schema` JSONB into typed items + loops.
 * `items` and `loops` are read independently (a malformed `items` must not drop
 * a valid loop list, and vice versa), mirroring the prior defensive reads.
 * Malformed individual items collapse to `{}`; loop entries that can't satisfy
 * the response contract (missing string `id`/`name`) are dropped — they could
 * never serialize through `showPerformanceLoopsResponseSchema` anyway.
 */
export function parseModeratorSnapshot(rawSchema: unknown): ParsedModeratorSnapshot {
  const schema = asRecord(rawSchema);

  const rawItems = schema?.items;
  const items: SnapshotFieldItem[] = Array.isArray(rawItems)
    ? rawItems.map((item) => {
        const parsed = snapshotFieldItemSchema.safeParse(item);
        return parsed.success ? parsed.data : {};
      })
    : [];

  const metadata = asRecord(schema?.metadata);
  const rawLoops = metadata?.loops;
  const loops: SnapshotLoop[] | null = Array.isArray(rawLoops)
    ? rawLoops.flatMap((loop) => {
        const parsed = snapshotLoopSchema.safeParse(loop);
        return parsed.success ? [parsed.data] : [];
      })
    : null;

  return { items, loops };
}

/**
 * Leniently coerces a task's raw `content` JSONB into a typed key→value map.
 * Absent / non-object content yields an empty map.
 */
export function parseTaskContent(content: unknown): TaskContent {
  return content !== null && typeof content === 'object'
    ? (content as TaskContent)
    : {};
}
