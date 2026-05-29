/**
 * Helper to analyze a task schema and content for fact bindings and extraction outcomes.
 * Surfaces warnings when a task will extract zero facts or has no bindings configured.
 *
 * NOTE: this is a deliberately lightweight *heuristic* for an advisory banner —
 * it is not a re-implementation of the server's `collectBoundFacts`
 * (apps/erify_api/.../fact-extraction.service.ts). In particular it does not
 * filter `__reason`/`__extra` sidecar keys, nor does it require a bound field's
 * `system_fact_key` to be a registered, scope-matching definition. As a result
 * it can under-warn in edge cases (e.g. a hydrated reason sidecar carrying a
 * value while the actual field is blank). The authoritative extraction outcome
 * is always the server's; this only nudges the approver before they confirm.
 */
export function getExtractionStatus(
  schema: any,
  content: Record<string, unknown>,
): {
    hasBindings: boolean;
    willExtractZeroFacts: boolean;
  } {
  if (!schema || !Array.isArray(schema.items)) {
    return { hasBindings: false, willExtractZeroFacts: true };
  }

  const boundFieldIds = new Set<string>();
  const boundFields = schema.items.filter((item: any) => {
    if (item.system_fact_key) {
      boundFieldIds.add(item.id);
      return true;
    }
    return false;
  });

  const hasBindings = boundFields.length > 0;
  if (!hasBindings) {
    return { hasBindings: false, willExtractZeroFacts: true };
  }

  // Check if any bound fields have non-empty values in the content
  let hasAnyValue = false;
  for (const [key, value] of Object.entries(content)) {
    if (value === null || value === undefined || value === '') {
      continue;
    }

    // Check if the key belongs to a bound field:
    // Either the key is the field ID (for show scope), or it is <fieldId>:<scope>:<targetUid>
    const colonIndex = key.indexOf(':');
    const fieldId = colonIndex !== -1 ? key.substring(0, colonIndex) : key;

    if (boundFieldIds.has(fieldId)) {
      hasAnyValue = true;
      break;
    }
  }

  return {
    hasBindings,
    willExtractZeroFacts: !hasAnyValue,
  };
}
