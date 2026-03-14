import { createFileRoute } from '@tanstack/react-router';
import { del, get, set } from 'idb-keyval';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useDebounceCallback } from 'usehooks-ts';

import { PageLayout } from '@/components/layouts/page-layout';
import { TemplateSchema, type TemplateSchemaType } from '@/components/task-templates/builder/schema';
import { TaskTemplateBuilder } from '@/components/task-templates/builder/task-template-builder';
import { useCreateTaskTemplate } from '@/features/task-templates/hooks/use-create-task-template';
import { formatZodErrors } from '@/lib/zod-utils';

const DRAFT_KEY = 'task_template_draft';

export const Route = createFileRoute('/studios/$studioId/task-templates/new')({
  component: TaskTemplateBuilderPage,
});

export function TaskTemplateBuilderPage() {
  const { studioId } = Route.useParams();
  const navigate = Route.useNavigate();

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
  const [template, setTemplate] = useState<TemplateSchemaType>({
    name: '',
    description: '',
    task_type: 'SETUP',
    items: [],
  });

  const debouncedSave = useDebounceCallback((data: TemplateSchemaType) => {
    set(DRAFT_KEY, data).catch(console.error);
  }, 1000);

  const onSave = useCallback((data: TemplateSchemaType) => {
    // Validate with Zod
    const result = TemplateSchema.safeParse(data);

    if (!result.success) {
      setErrors(formatZodErrors(result.error));
      toast.error('Validation failed', {
        description: 'Please fix the errors in the template before saving.',
      });
      return;
    }

    setErrors({});

    const schemaItems = data.items.map((item) => ({
      ...item,
      // Filter out empty options
      options: item.options?.filter((o) => o.value.trim() !== ''),
    }));

    // Transform structure to match backend API contract
    const schemaMetadata = data.metadata && Object.keys(data.metadata).length > 0
      ? data.metadata
      : undefined;
    const payload = {
      name: data.name,
      description: data.description,
      task_type: data.task_type,
      schema: {
        items: schemaItems,
        ...(schemaMetadata ? { metadata: schemaMetadata } : {}),
      },
    };

    createTemplate(payload);
  }, [createTemplate]);

  const handleCancel = useCallback(async () => {
    await del(DRAFT_KEY);
    navigate({ to: '/studios/$studioId/task-templates', params: { studioId } });
  }, [navigate, studioId]);

  const handleTemplateChange = useCallback((data: TemplateSchemaType) => {
    setTemplate(data);

    setErrors((prev) => (Object.keys(prev).length > 0 ? {} : prev));
  }, []);

  useEffect(() => {
    get(DRAFT_KEY).then((saved) => {
      if (saved) {
        setTemplate((prev) => ({
          ...prev,
          ...(saved as Partial<TemplateSchemaType>),
          task_type: (saved as Partial<TemplateSchemaType>)?.task_type ?? prev.task_type,
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
      <TaskTemplateBuilder
        template={template}
        onChange={handleTemplateChange}
        isSaving={isSaving}
        onSave={onSave}
        onCancel={handleCancel}
        errors={errors}
      />
    </PageLayout>
  );
}
