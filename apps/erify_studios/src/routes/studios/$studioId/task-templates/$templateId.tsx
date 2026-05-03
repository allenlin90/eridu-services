import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { getSchemaEngine, safeParseTemplateSchema } from '@eridu/api-types/task-management';

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

  // Block the editor for schemas with an unsupported engine or that fail validation.
  // v1 (implicit or explicit) proceeds normally. Unknown engines and invalid documents
  // render a blocking error — the builder is never mounted in that state.
  let schemaError: string | null = null;
  const rawSchema = taskTemplate.current_schema;
  try {
    const engine = getSchemaEngine(rawSchema);
    // TODO(phase-4): allow 'task_template_v2' once the v2 builder UX is wired
    if (engine !== 'task_template_v1') {
      schemaError = `Template uses schema engine "${engine}" which requires a newer editor version. Contact support or use the normalization script's --validate-only output to inspect.`;
    }
  }
  catch (err) {
    schemaError = (err as Error).message;
  }
  if (!schemaError) {
    const parsed = safeParseTemplateSchema(rawSchema);
    if (!parsed.success) {
      schemaError = parsed.error.issues[0]?.message ?? 'Template schema is invalid';
    }
  }

  if (schemaError) {
    return (
      <PageLayout
        title="Template Schema Error"
        breadcrumbs={(
          <span className="text-sm text-muted-foreground">
            {`Studios / ${studioId} / Task Templates / ${taskTemplate.name}`}
          </span>
        )}
      >
        <div className="flex items-center justify-center h-[calc(100vh-13rem)]">
          <div className="max-w-lg space-y-3 rounded-md border border-destructive/30 bg-destructive/10 p-6 text-sm">
            <div className="font-semibold text-destructive">This template cannot be edited</div>
            <div className="text-destructive/80">{schemaError}</div>
            <div className="text-muted-foreground">
              {`Template: ${taskTemplate.name} (${templateId})`}
            </div>
          </div>
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
  const {
    data: sharedFieldsResponse,
    isError: isSharedFieldsError,
  } = useStudioSharedFields({ studioId });

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
