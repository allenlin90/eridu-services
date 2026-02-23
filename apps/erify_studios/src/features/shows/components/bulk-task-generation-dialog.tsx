import { useParams } from '@tanstack/react-router';
import { useState } from 'react';

import {
  AsyncMultiCombobox,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@eridu/ui';

import type { ShowSelection } from '@/features/studio-shows/api/get-studio-shows';
import { useGenerateTasks } from '@/features/studio-shows/hooks/use-generate-tasks';
import { useAllTaskTemplates } from '@/features/task-templates/hooks/use-all-task-templates';

type BulkTaskGenerationDialogProps = {
  shows: ShowSelection[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function BulkTaskGenerationDialog({
  shows,
  open,
  onOpenChange,
  onSuccess,
}: BulkTaskGenerationDialogProps) {
  const { studioId } = useParams({ strict: false }) as { studioId: string };
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [templateSearch, setTemplateSearch] = useState('');
  const [dueDateOverrides, setDueDateOverrides] = useState<Record<string, string>>({});

  const { data: templates, isLoading: isLoadingTemplates } = useAllTaskTemplates({
    studioId,
    search: templateSearch || undefined,
    limit: 10,
  });
  const { mutate: generateTasks, isPending: isGenerating } = useGenerateTasks({
    studioId,
    onSuccess: () => {
      onOpenChange(false);
      setSelectedTemplateIds([]);
      setTemplateSearch('');
      setDueDateOverrides({});
      onSuccess?.();
    },
  });

  const handleGenerate = () => {
    if (selectedTemplateIds.length === 0 || shows.length === 0)
      return;

    generateTasks({
      show_uids: shows.map((s) => s.id),
      template_uids: selectedTemplateIds,
      due_dates: Object.fromEntries(
        Object.entries(dueDateOverrides)
          .filter(([, value]) => Boolean(value))
          .map(([templateUid, value]) => [templateUid, new Date(value).toISOString()]),
      ),
    });
  };
  const templateOptions = (templates ?? []).map((template) => ({
    value: template.id,
    label: `${template.name} (${template.task_type})`,
  }));
  const selectedOptionalDueTemplates = (templates ?? []).filter((template) =>
    selectedTemplateIds.includes(template.id)
    && ['ADMIN', 'ROUTINE', 'OTHER'].includes(template.task_type),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            Generate Tasks for
            {' '}
            {shows.length}
            {' '}
            Show(s)
          </DialogTitle>
          <DialogDescription>
            Select task templates to generate tasks across the chosen shows.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 flex flex-col gap-4">
          <div className="max-h-32 overflow-y-auto border rounded-md p-2 bg-slate-50 text-sm">
            <p className="font-medium text-slate-500 mb-2 px-1">Selected Shows</p>
            <div className="flex flex-col gap-1">
              {shows.map((show) => (
                <div key={show.id} className="text-sm px-1 truncate" title={show.name}>
                  •
                  {' '}
                  {show.name}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="font-medium text-slate-900 mb-3">Available Templates</p>
            <AsyncMultiCombobox
              value={selectedTemplateIds}
              onChange={setSelectedTemplateIds}
              onSearch={setTemplateSearch}
              options={templateOptions}
              isLoading={isLoadingTemplates}
              placeholder="Search task templates..."
              emptyMessage={templateSearch ? 'No templates match your search.' : 'No active templates found for this studio.'}
              disabled={isGenerating}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Showing up to 10 templates.
              {' '}
              {templateSearch ? 'Refine your search to find specific templates.' : 'Type to search more templates.'}
            </p>
          </div>

          {selectedOptionalDueTemplates.length > 0 && (
            <div className="space-y-2">
              <p className="font-medium text-slate-900">Optional Due Time Overrides</p>
              <p className="text-xs text-muted-foreground">
                Only applies to ADMIN / ROUTINE / OTHER templates.
              </p>
              {selectedOptionalDueTemplates.map((template) => (
                <div key={template.id} className="space-y-1">
                  <p className="text-sm">{template.name}</p>
                  <Input
                    type="datetime-local"
                    value={dueDateOverrides[template.id] ?? ''}
                    onChange={(event) => {
                      setDueDateOverrides((prev) => ({
                        ...prev,
                        [template.id]: event.target.value,
                      }));
                    }}
                    disabled={isGenerating}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || selectedTemplateIds.length === 0}
          >
            {isGenerating ? 'Generating...' : `Generate ${selectedTemplateIds.length * shows.length} Tasks`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
