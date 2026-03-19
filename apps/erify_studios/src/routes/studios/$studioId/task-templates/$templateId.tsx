import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { PageLayout } from '@/components/layouts/page-layout';
import { TemplateSchema, type TemplateSchemaType } from '@/components/task-templates/builder/schema';
import { TaskTemplateBuilder } from '@/components/task-templates/builder/task-template-builder';
import { useStudioSharedFields } from '@/features/studio-shared-fields/hooks/use-studio-shared-fields';
import type { GetTaskTemplateResponse } from '@/features/task-templates/api/get-task-template';
import { useTaskTemplate } from '@/features/task-templates/hooks/use-task-template';
import { useUpdateTaskTemplate } from '@/features/task-templates/hooks/use-update-task-template';
import { formatZodErrors } from '@/lib/zod-utils';

export const Route = createFileRoute('/studios/$studioId/task-templates/$templateId')({
  component: EditTaskTemplatePage,
});

function EditTaskTemplatePage() {
  const { studioId, templateId } = Route.useParams();

  const { data: taskTemplate, isLoading: isFetching } = useTaskTemplate({
    studioId,
    templateId,
  });

  if (isFetching) {
    return (
      <PageLayout
        title="Edit Template"
        breadcrumbs={(
          <span className="text-sm text-muted-foreground">
            {`Studios / ${studioId} / Task Templates / Edit`}
          </span>
        )}
      >
        <div className="flex items-center justify-center h-[calc(100vh-13rem)]">
          <div className="text-muted-foreground">Loading template...</div>
        </div>
      </PageLayout>
    );
  }

  if (!taskTemplate) {
    return (
      <PageLayout
        title="Error"
        breadcrumbs={(
          <span className="text-sm text-muted-foreground">
            {`Studios / ${studioId} / Task Templates / Error`}
          </span>
        )}
      >
        <div className="flex items-center justify-center h-[calc(100vh-13rem)]">
          <div className="text-destructive">Failed to load template.</div>
        </div>
      </PageLayout>
    );
  }

  return <TaskTemplateForm studioId={studioId} taskTemplate={taskTemplate} />;
}

type TaskTemplateFormProps = {
  studioId: string;
  taskTemplate: GetTaskTemplateResponse;
};

function TaskTemplateForm({ studioId, taskTemplate }: TaskTemplateFormProps) {
  const navigate = Route.useNavigate();
  const { templateId } = Route.useParams();
  const { data: sharedFieldsResponse } = useStudioSharedFields({ studioId });

  const { mutate: updateTemplate, isPending: isSaving } = useUpdateTaskTemplate({
    studioId,
    templateId,
    onSuccess: async () => {
      toast.success('Template updated', {
        description: 'Your task template has been updated successfully.',
      });
      navigate({ to: '/studios/$studioId/task-templates', params: { studioId } });
    },
  });

  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const [template, setTemplate] = useState<TemplateSchemaType>(() => ({
    name: taskTemplate.name,
    description: taskTemplate.description ?? '',
    task_type: taskTemplate.task_type,
    items: taskTemplate.current_schema?.items ?? [],
    metadata: taskTemplate.current_schema?.metadata as TemplateSchemaType['metadata'] | undefined,
  }));

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
      version: taskTemplate.version,
    };

    updateTemplate(payload);
  }, [updateTemplate, taskTemplate.version]);

  const handleCancel = useCallback(() => {
    navigate({ to: '/studios/$studioId/task-templates', params: { studioId } });
  }, [navigate, studioId]);

  const handleTemplateChange = useCallback((data: TemplateSchemaType) => {
    setTemplate(data);
    setErrors((prev) => (Object.keys(prev).length > 0 ? {} : prev));
  }, []);

  return (
    <PageLayout
      title="Edit Template"
      description="Edit the task template using the form builder."
      breadcrumbs={(
        <span className="text-sm text-muted-foreground">
          {`Studios / ${studioId} / Task Templates / ${taskTemplate.name}`}
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
        sharedFields={sharedFieldsResponse?.shared_fields ?? []}
      />
    </PageLayout>
  );
}
