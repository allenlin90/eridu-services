import type { InfiniteData } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import {
  compactInfiniteTaskTemplatePages,
  removeTaskTemplateFromInfinitePages,
  upsertTaskTemplateInInfinitePages,
} from '../task-template-cache-utils';

import type { GetTaskTemplatesResponse } from '@/features/task-templates/api/get-task-templates';

function buildTemplate(id: string) {
  return {
    id,
    name: `Template ${id}`,
    description: null,
    task_type: 'SETUP',
    is_active: true,
    current_schema: { items: [] },
    version: 1,
    created_at: '2026-03-14T00:00:00.000Z',
    updated_at: '2026-03-14T00:00:00.000Z',
  } as const;
}

function buildInfiniteData(
  page1Ids: string[],
  page2Ids: string[] = [],
): InfiniteData<GetTaskTemplatesResponse> {
  const page1 = {
    data: page1Ids.map(buildTemplate),
    meta: {
      page: 1,
      limit: 10,
      total: page1Ids.length + page2Ids.length,
      totalPages: page2Ids.length > 0 ? 2 : 1,
    },
  };
  const page2 = {
    data: page2Ids.map(buildTemplate),
    meta: {
      page: 2,
      limit: 10,
      total: page1Ids.length + page2Ids.length,
      totalPages: 2,
    },
  };

  return {
    pages: page2Ids.length > 0 ? [page1, page2] : [page1],
    pageParams: page2Ids.length > 0 ? [1, 2] : [1],
  };
}

describe('taskTemplateCacheUtils', () => {
  it('compacts infinite pages down to first page only', () => {
    const original = buildInfiniteData(['ttpl_1'], ['ttpl_2']);
    const compacted = compactInfiniteTaskTemplatePages(original);

    expect(compacted?.pages).toHaveLength(1);
    expect(compacted?.pageParams).toEqual([1]);
    expect(compacted?.pages[0]?.data.map((row) => row.id)).toEqual(['ttpl_1']);
  });

  it('updates existing template in cached pages', () => {
    const original = buildInfiniteData(['ttpl_1', 'ttpl_2']);
    const next = upsertTaskTemplateInInfinitePages(
      original,
      {
        ...buildTemplate('ttpl_2'),
        name: 'Updated',
      },
    );

    expect(next?.pages[0]?.data.find((row) => row.id === 'ttpl_2')?.name).toBe('Updated');
    expect(next?.pages[0]?.meta.total).toBe(2);
  });

  it('prepends missing template and increments total', () => {
    const original = buildInfiniteData(['ttpl_1']);
    const next = upsertTaskTemplateInInfinitePages(
      original,
      buildTemplate('ttpl_3'),
    );

    expect(next?.pages[0]?.data.map((row) => row.id)).toEqual(['ttpl_3', 'ttpl_1']);
    expect(next?.pages[0]?.meta.total).toBe(2);
  });

  it('removes deleted template and decrements total', () => {
    const original = buildInfiniteData(['ttpl_1', 'ttpl_2'], ['ttpl_3']);
    const next = removeTaskTemplateFromInfinitePages(original, 'ttpl_2');

    expect(next?.pages[0]?.data.map((row) => row.id)).toEqual(['ttpl_1']);
    expect(next?.pages[0]?.meta.total).toBe(2);
  });
});
