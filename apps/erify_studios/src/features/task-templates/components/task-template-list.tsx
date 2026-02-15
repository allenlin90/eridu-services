import { AlertCircle } from 'lucide-react';

import type { TaskTemplateDto } from '@eridu/api-types/task-management';
import { Spinner } from '@eridu/ui';

import { TaskTemplateCard } from './task-template-card';

import { ResponsiveCardGrid } from '@/components/responsive-card-grid';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';

export type TaskTemplateListProps = {
  templates: TaskTemplateDto[];
  isLoading: boolean;
  isError?: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  studioId: string;
};

export function TaskTemplateList({
  templates,
  isLoading,
  isError,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  studioId,
}: TaskTemplateListProps) {
  const sentinelRef = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  if (isLoading) {
    return (
      <ResponsiveCardGrid>
        {['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'].map((id) => (
          <div
            key={id}
            className="h-50 border rounded-lg bg-muted/20 animate-pulse"
          />
        ))}
      </ResponsiveCardGrid>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border-2 border-destructive/50 rounded-lg text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold text-destructive mb-2">
          Failed to load templates
        </h3>
        <p className="text-sm text-muted-foreground">
          There was an error loading the task templates. Please try refreshing
          the page.
        </p>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg text-center">
        <h3 className="mt-2 text-xl font-semibold">No templates found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a new template to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      <ResponsiveCardGrid>
        {templates.map((template) => (
          <TaskTemplateCard
            key={template.id}
            template={template}
            studioId={studioId}
          />
        ))}
      </ResponsiveCardGrid>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />

      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Spinner className="h-6 w-6" />
        </div>
      )}
    </>
  );
}
