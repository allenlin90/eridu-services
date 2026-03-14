import type { InfiniteData } from '@tanstack/react-query';

import type { TaskTemplateDto } from '@eridu/api-types/task-management';

import type { GetTaskTemplatesResponse } from '../api/get-task-templates';

export function compactInfiniteTaskTemplatePages(
  data: InfiniteData<GetTaskTemplatesResponse> | undefined,
): InfiniteData<GetTaskTemplatesResponse> | undefined {
  if (!data || data.pages.length <= 1) {
    return data;
  }

  return {
    pages: [data.pages[0]],
    pageParams: [data.pageParams[0]],
  };
}

export function upsertTaskTemplateInInfinitePages(
  data: InfiniteData<GetTaskTemplatesResponse> | undefined,
  template: TaskTemplateDto,
): InfiniteData<GetTaskTemplatesResponse> | undefined {
  if (!data) {
    return data;
  }

  let updated = false;
  const pages = data.pages.map((page) => {
    const nextData = page.data.map((item) => {
      if (item.id !== template.id) {
        return item;
      }

      updated = true;
      return template;
    });

    return updated ? { ...page, data: nextData } : page;
  });

  if (updated) {
    return {
      ...data,
      pages,
    };
  }

  const [firstPage, ...restPages] = data.pages;
  if (!firstPage) {
    return data;
  }

  const nextTotal = firstPage.meta.total + 1;
  const nextLimit = firstPage.meta.limit;
  const nextTotalPages = Math.max(
    firstPage.meta.totalPages,
    Math.ceil(nextTotal / nextLimit),
  );

  return {
    ...data,
    pages: [
      {
        ...firstPage,
        data: [template, ...firstPage.data],
        meta: {
          ...firstPage.meta,
          total: nextTotal,
          totalPages: nextTotalPages,
        },
      },
      ...restPages,
    ],
  };
}

export function removeTaskTemplateFromInfinitePages(
  data: InfiniteData<GetTaskTemplatesResponse> | undefined,
  templateId: string,
): InfiniteData<GetTaskTemplatesResponse> | undefined {
  if (!data) {
    return data;
  }

  let removedCount = 0;
  const pages = data.pages.map((page) => {
    const nextData = page.data.filter((item) => {
      const shouldKeep = item.id !== templateId;
      if (!shouldKeep) {
        removedCount += 1;
      }
      return shouldKeep;
    });

    return nextData.length === page.data.length
      ? page
      : { ...page, data: nextData };
  });

  if (removedCount === 0 || pages.length === 0) {
    return data;
  }

  const [firstPage, ...restPages] = pages;
  if (!firstPage) {
    return data;
  }

  const nextTotal = Math.max(0, firstPage.meta.total - removedCount);
  const nextTotalPages = Math.ceil(nextTotal / firstPage.meta.limit);

  return {
    ...data,
    pages: [
      {
        ...firstPage,
        meta: {
          ...firstPage.meta,
          total: nextTotal,
          totalPages: nextTotalPages,
        },
      },
      ...restPages,
    ],
  };
}
