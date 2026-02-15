import type {
  ListTaskTemplatesQuery,
  TaskTemplateDto,
} from '@eridu/api-types/task-management';

import { generateMockTemplates } from '../fixtures';

// Generate a static set of mock templates for consistency
const MOCK_TEMPLATES = generateMockTemplates(100);

export type GetTaskTemplatesResponse = {
  data: TaskTemplateDto[];
  meta: {
    nextCursor?: string;
    total: number;
  };
};

export async function getTaskTemplatesMock(
  _studioId: string,
  query: ListTaskTemplatesQuery & { cursor?: string },
): Promise<GetTaskTemplatesResponse> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  let filtered = [...MOCK_TEMPLATES];

  // Client-side filtering for mock
  if (query.name) {
    const searchLower = query.name.toLowerCase();
    filtered = filtered.filter((t) =>
      t.name.toLowerCase().includes(searchLower),
    );
  }

  // Cursor-based Pagination logic
  const limit = Number(query.limit) || 20;
  let startIndex = 0;

  if (query.cursor) {
    const cursorIndex = filtered.findIndex((t) => t.id === query.cursor);
    if (cursorIndex !== -1) {
      startIndex = cursorIndex + 1;
    }
  } else {
    // If page is provided (backward compatibility / initial load), fallback to offset
    const page = Number(query.page) || 1;
    startIndex = (page - 1) * limit;
  }

  const endIndex = startIndex + limit;
  const paginated = filtered.slice(startIndex, endIndex);

  const nextItem = filtered[endIndex];
  const nextCursor = nextItem ? nextItem.id : undefined;

  return {
    data: paginated,
    meta: {
      total: filtered.length,
      nextCursor,
    },
  };
}
