import { useParams } from '@tanstack/react-router';
import { ChevronDown, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { TaskType } from '@eridu/api-types/task-management';
import {
  Badge,
  Button,
  Checkbox,
  DateTimePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
} from '@eridu/ui';

import type { ShowSelection } from '@/features/studio-shows/api/get-studio-shows';
import { useGenerateTasks } from '@/features/studio-shows/hooks/use-generate-tasks';
import { useAllTaskTemplates } from '@/features/task-templates/hooks/use-all-task-templates';
import { getTaskTypeLabel, getTaskTypeOptions } from '@/lib/constants/task-type-labels';

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
  const taskTypeOptions = getTaskTypeOptions();
  const { studioId } = useParams({ strict: false }) as { studioId: string };
  // null = user hasn't made any explicit selection → default to all templates selected
  const [userSelectedIds, setUserSelectedIds] = useState<string[] | null>(null);
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedTaskTypes, setSelectedTaskTypes] = useState<TaskType[]>([]);
  const [dueDateOverrides, setDueDateOverrides] = useState<Record<string, string>>({});

  const resetDialogState = () => {
    setUserSelectedIds(null);
    setTemplateSearch('');
    setSelectedTaskTypes([]);
    setDueDateOverrides({});
  };

  const { data: templates, isLoading: isLoadingTemplates } = useAllTaskTemplates({
    studioId,
    pageSize: 100,
    enabled: open,
  });
  const { mutate: generateTasks, isPending: isGenerating } = useGenerateTasks({
    studioId,
    onSuccess: () => {
      onOpenChange(false);
      resetDialogState();
      onSuccess?.();
    },
  });

  const allTemplates = useMemo(() => templates ?? [], [templates]);
  // When user hasn't made any selection, default to all templates selected
  const selectedTemplateIds = userSelectedIds ?? allTemplates.map((t) => t.id);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetDialogState();
    }
    onOpenChange(newOpen);
  };

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

  const filteredTemplates = useMemo(() => {
    const normalizedSearch = templateSearch.trim().toLowerCase();
    return allTemplates.filter((template) => {
      const matchesSearch = normalizedSearch.length === 0
        || template.name.toLowerCase().includes(normalizedSearch);
      const matchesType = selectedTaskTypes.length === 0
        || selectedTaskTypes.includes(template.task_type);
      return matchesSearch && matchesType;
    });
  }, [allTemplates, selectedTaskTypes, templateSearch]);

  const selectedOptionalDueTemplates = allTemplates.filter((template) =>
    selectedTemplateIds.includes(template.id)
    && ['ADMIN', 'ROUTINE', 'OTHER'].includes(template.task_type),
  );

  const toggleTemplate = (templateId: string) => {
    setUserSelectedIds((prev) => {
      const base = prev ?? allTemplates.map((t) => t.id);
      return base.includes(templateId)
        ? base.filter((id) => id !== templateId)
        : [...base, templateId];
    });
  };

  const toggleTaskType = (taskType: TaskType) => {
    setSelectedTaskTypes((prev) =>
      prev.includes(taskType)
        ? prev.filter((type) => type !== taskType)
        : [...prev, taskType]);
  };

  const selectAllTemplates = () => {
    setUserSelectedIds(allTemplates.map((template) => template.id));
  };

  const clearAllTemplates = () => {
    setUserSelectedIds([]);
  };

  const selectVisibleTemplates = () => {
    setUserSelectedIds((prev) => {
      const base = prev ?? allTemplates.map((t) => t.id);
      const next = new Set(base);
      filteredTemplates.forEach((template) => next.add(template.id));
      return [...next];
    });
  };

  const selectedInFilteredCount = filteredTemplates.filter((template) => selectedTemplateIds.includes(template.id)).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
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
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="font-medium text-slate-900">Available Templates</p>
              <p className="text-xs text-muted-foreground">
                Selected
                {' '}
                {selectedTemplateIds.length}
                {' '}
                /
                {' '}
                {allTemplates.length}
              </p>
            </div>

            <div className="mb-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 text-xs" disabled={isGenerating}>
                    Task Type
                    {selectedTaskTypes.length > 0 ? ` (${selectedTaskTypes.length})` : ''}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Filter By Type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {taskTypeOptions.map(({ value: taskType, label }) => (
                    <DropdownMenuCheckboxItem
                      key={taskType}
                      checked={selectedTaskTypes.includes(taskType)}
                      onCheckedChange={() => toggleTaskType(taskType)}
                      onSelect={(event) => event.preventDefault()}
                    >
                      {label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="relative mb-2">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
              <Input
                value={templateSearch}
                onChange={(event) => setTemplateSearch(event.target.value)}
                placeholder="Search templates by name..."
                className="h-8 pl-8 text-sm"
                disabled={isGenerating}
              />
            </div>

            <div className="mb-2 flex flex-wrap items-center gap-1">
              <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={selectAllTemplates} disabled={isGenerating || allTemplates.length === 0}>
                Select all
              </Button>
              <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={selectVisibleTemplates} disabled={isGenerating || filteredTemplates.length === 0}>
                Select visible
              </Button>
              <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={clearAllTemplates} disabled={isGenerating || selectedTemplateIds.length === 0}>
                Clear all
              </Button>
              <span className="ml-auto text-xs text-muted-foreground">
                Visible
                {' '}
                {filteredTemplates.length}
                {' '}
                (
                {selectedInFilteredCount}
                {' '}
                selected)
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto rounded-md border">
              {isLoadingTemplates && (
                <p className="p-3 text-sm text-muted-foreground">Loading templates...</p>
              )}
              {!isLoadingTemplates && filteredTemplates.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">
                  {allTemplates.length === 0
                    ? 'No active templates found for this studio.'
                    : 'No templates match current filters.'}
                </p>
              )}
              {!isLoadingTemplates && filteredTemplates.map((template) => {
                const isChecked = selectedTemplateIds.includes(template.id);
                return (
                  <label
                    key={template.id}
                    className="flex cursor-pointer items-center gap-2 border-b px-3 py-2 last:border-b-0 hover:bg-muted/30"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleTemplate(template.id)}
                      disabled={isGenerating}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{template.name}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {getTaskTypeLabel(template.task_type)}
                    </Badge>
                  </label>
                );
              })}
            </div>
          </div>

          {selectedOptionalDueTemplates.length > 0 && (
            <div className="space-y-2">
              <p className="font-medium text-slate-900">Optional Due Time Overrides</p>
              <p className="text-xs text-muted-foreground">
                Only applies to ADMIN / ROUTINE / OTHER templates.
              </p>
              {selectedOptionalDueTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`space-y-1 ${isGenerating ? 'pointer-events-none opacity-60' : ''}`}
                  aria-disabled={isGenerating}
                >
                  <p className="text-sm">{template.name}</p>
                  <DateTimePicker
                    value={dueDateOverrides[template.id] ?? ''}
                    onChange={(value) => {
                      setDueDateOverrides((prev) => ({
                        ...prev,
                        [template.id]: value,
                      }));
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isGenerating}>
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
