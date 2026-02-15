import type { z } from 'zod';

/**
 * Formats Zod errors into a Rails-style aggregated format: { [fieldPath]: string[] }
 * Nested paths are flattened into a string joined by dots (e.g., "items.0.key")
 */
export function formatZodErrors(error: z.ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  error.issues.forEach((issue) => {
    const path = issue.path.join('.');
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  });

  return formatted;
}
