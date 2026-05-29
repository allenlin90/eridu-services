/**
 * Helper to analyze a task schema and content for fact bindings and extraction outcomes.
 * Surfaces warnings when a task will extract zero facts or has no bindings configured.
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
