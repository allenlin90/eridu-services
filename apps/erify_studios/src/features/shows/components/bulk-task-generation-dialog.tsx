import { useParams } from '@tanstack/react-router';
import { useState } from 'react';

import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Skeleton,
} from '@eridu/ui';

import type { StudioShow } from '@/features/studio-shows/api/get-studio-shows';
import { useGenerateTasks } from '@/features/studio-shows/hooks/use-generate-tasks';
import { useAllTaskTemplates } from '@/features/task-templates/hooks/use-all-task-templates';

type BulkTaskGenerationDialogProps = {
  shows: StudioShow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BulkTaskGenerationDialog({ shows, open, onOpenChange }: BulkTaskGenerationDialogProps) {
  const { studioId } = useParams({ strict: false }) as { studioId: string };
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());

  const { data: templates, isLoading: isLoadingTemplates } = useAllTaskTemplates({ studioId });
  const { mutate: generateTasks, isPending: isGenerating } = useGenerateTasks({
    studioId,
    onSuccess: () => {
      onOpenChange(false);
      setSelectedTemplates(new Set());
    },
  });

  const handleGenerate = () => {
    if (selectedTemplates.size === 0 || shows.length === 0)
      return;

    generateTasks({
      show_uids: shows.map((s) => s.id),
      template_uids: Array.from(selectedTemplates),
    });
  };

  const toggleTemplate = (templateId: string) => {
    const next = new Set(selectedTemplates);
    if (next.has(templateId)) {
      next.delete(templateId);
    } else {
      next.add(templateId);
    }
    setSelectedTemplates(next);
  };

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
            {isLoadingTemplates
              ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[220px]" />
                  </div>
                )
              : templates && templates.length > 0
                ? (
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                      {templates.map((template) => (
                        <label
                          key={template.id}
                          className="flex items-start space-x-3 space-y-0 p-2 border rounded-md hover:bg-slate-50 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedTemplates.has(template.id)}
                            onCheckedChange={() => toggleTemplate(template.id)}
                          />
                          <div className="space-y-1 leading-none">
                            <p className="text-sm font-medium leading-none">{template.name}</p>
                            {template.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {template.description}
                              </p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )
                : (
                    <p className="text-sm text-muted-foreground italic bg-slate-50 p-3 rounded border text-center">
                      No active templates found for this studio.
                    </p>
                  )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || selectedTemplates.size === 0}
          >
            {isGenerating ? 'Generating...' : `Generate ${selectedTemplates.size * shows.length} Tasks`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
