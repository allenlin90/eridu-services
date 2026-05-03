import { createFileRoute } from '@tanstack/react-router';
import { del, get, set } from 'idb-keyval';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useDebounceCallback } from 'usehooks-ts';

import { PageLayout } from '@/components/layouts/page-layout';
import {
  buildTemplateSchemaPayload,
  createDefaultBuilderTemplate,
  shouldUseSavedBuilderDraft,
} from '@/components/task-templates/builder/payload';
import { type BuilderTemplateSchemaType, safeParseBuilderTemplateSchema } from '@/components/task-templates/builder/schema';
import { TaskTemplateBuilder } from '@/components/task-templates/builder/task-template-builder';
import { useStudioSharedFields } from '@/features/studio-shared-fields/hooks/use-studio-shared-fields';
import { useCreateTaskTemplate } from '@/features/task-templates/hooks/use-create-task-template';
import { formatZodErrors } from '@/lib/zod-utils';

const DRAFT_KEY = 'task_template_draft';

export const Route = createFileRoute('/studios/$studioId/task-templates/new')({
  component: TaskTemplateBuilderPage,
});

export function TaskTemplateBuilderPage() {
  const { studioId } = Route.useParams();
  const navigate = Route.useNavigate();
  const {
    data: sharedFieldsResponse,
    isError: isSharedFieldsError,
  } = useStudioSharedFields({ studioId });

  const { mutate: createTemplate, isPending: isSaving } = useCreateTaskTemplate({
    studioId,
    onSuccess: async () => {
      // Clear draft
      await del(DRAFT_KEY);

      toast.success('Template created', {
        description: 'Your new task template has been saved successfully.',
      });
      navigate({ to: '/studios/$studioId/task-templates', params: { studioId } });
    },
    onError: (error) => {
      toast.error('Error creating template', {
        description: error.message,
      });
    },
  });

  // Load draft from local storage on mount if no initial data is provided
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [template, setTemplate] = useState<BuilderTemplateSchemaType>(() => createDefaultBuilderTemplate());

  const debouncedSave = useDebounceCallback((data: BuilderTemplateSchemaType) => {
    set(DRAFT_KEY, data).catch(console.error);
  }, 1000);

  const onSave = useCallback((data: BuilderTemplateSchemaType) => {
    // Validate with Zod
    const result = safeParseBuilderTemplateSchema(data);

    if (!result.success) {
      setErrors(formatZodErrors(result.error));
      toast.error('Validation failed', {
        description: 'Please fix the errors in the template before saving.',
      });
      return;
    }

    setErrors({});

    // Transform structure to match backend API contract
    const payload = {
      name: data.name,
      description: data.description,
      task_type: data.task_type,
      schema: buildTemplateSchemaPayload(data),
    };

    createTemplate(payload);
  }, [createTemplate]);

  const handleCancel = useCallback(async () => {
    await del(DRAFT_KEY);
    navigate({ to: '/studios/$studioId/task-templates', params: { studioId } });
  }, [navigate, studioId]);

  const handleTemplateChange = useCallback((data: BuilderTemplateSchemaType) => {
    setTemplate(data);

    setErrors((prev) => (Object.keys(prev).length > 0 ? {} : prev));
  }, []);

  useEffect(() => {
    get(DRAFT_KEY).then((saved) => {
      if (shouldUseSavedBuilderDraft(saved)) {
        setTemplate((prev) => ({
          ...prev,
          ...saved,
          task_type: saved.task_type ?? prev.task_type,
        }));
      }
      setIsLoading(false);
    });
  }, []);

  // Save to IndexedDB whenever template changes, but only after initial load
  useEffect(() => {
    if (!isLoading) {
      debouncedSave(template);
    }
  }, [template, debouncedSave, isLoading]);

  if (isLoading) {
    return (
      <PageLayout
        title="Create Template"
        breadcrumbs={(
          <span className="text-sm text-muted-foreground">
            {`Studios / ${studioId} / Task Templates / New`}
          </span>
        )}
      >
        <div className="flex items-center justify-center h-[calc(100vh-13rem)]">
          <div className="text-muted-foreground">Loading draft...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Create Template"
      description="Design a new task template using the form builder."
      breadcrumbs={(
        <span className="text-sm text-muted-foreground">
          {`Studios / ${studioId} / Task Templates / New`}
        </span>
      )}
    >
      {isSharedFieldsError && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <div className="font-semibold">Shared fields unavailable</div>
          <div>Failed to load studio shared fields. Shared-field insertion is temporarily unavailable on this page.</div>
        </div>
      )}
      <TaskTemplateBuilder
        template={template}
        onChange={handleTemplateChange}
        isSaving={isSaving}
        onSave={onSave}
        onCancel={handleCancel}
        errors={errors}
        sharedFields={sharedFieldsResponse?.shared_fields ?? []}
        studioId={studioId}
      />
    </PageLayout>
  );
}
