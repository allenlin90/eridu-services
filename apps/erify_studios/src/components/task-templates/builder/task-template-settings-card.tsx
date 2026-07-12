import { ChevronsUpDown } from 'lucide-react';

import {
  AsyncCombobox,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@eridu/ui';

import type { BuilderTemplateSchemaType } from './schema';

import { getTaskTypeLabel } from '@/lib/constants/task-type-labels';

type TaskTemplateSettingsCardProps = {
  template: BuilderTemplateSchemaType;
  errors?: Record<string, string[]>;
  isOpen: boolean;
  localName: string;
  localDescription: string;
  isModerationMode: boolean;
  clientOptions: Array<{ value: string; label: string }>;
  isClientsLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onTaskTypeChange: (value: BuilderTemplateSchemaType['task_type']) => void;
  onWorkflowModeChange: (value: 'STANDARD' | 'MODERATION') => void;
  onClientChange: (value: string) => void;
  onClientSearch: (value: string) => void;
};

/** Renders template identity, workflow, task-type, and client settings. */
export function TaskTemplateSettingsCard({
  template,
  errors,
  isOpen,
  localName,
  localDescription,
  isModerationMode,
  clientOptions,
  isClientsLoading,
  onOpenChange,
  onNameChange,
  onDescriptionChange,
  onTaskTypeChange,
  onWorkflowModeChange,
  onClientChange,
  onClientSearch,
}: TaskTemplateSettingsCardProps) {
  return (
    <div className="space-y-4 p-1">
      <Collapsible open={isOpen} onOpenChange={onOpenChange} className="border rounded-lg bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="font-semibold text-sm">{template.name || 'Untitled Template'}</h3>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-9 p-0">
              <ChevronsUpDown className="h-4 w-4" />
              <span className="sr-only">Toggle</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="px-4 pb-4 space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className={errors?.name ? 'text-destructive' : ''}>
              Template Name
            </Label>
            <Input
              id="name"
              value={localName}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="e.g., Pre-Production Checklist"
              className={errors?.name ? 'border-destructive' : ''}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={localDescription}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder="Brief description of this template..."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="task-type">Task Type</Label>
            <Select value={template.task_type} onValueChange={onTaskTypeChange}>
              <SelectTrigger id="task-type"><SelectValue placeholder="Select task type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SETUP">{getTaskTypeLabel('SETUP')}</SelectItem>
                <SelectItem value="ACTIVE">{getTaskTypeLabel('ACTIVE')}</SelectItem>
                <SelectItem value="CLOSURE">{getTaskTypeLabel('CLOSURE')}</SelectItem>
                <SelectItem value="ADMIN">{getTaskTypeLabel('ADMIN')}</SelectItem>
                <SelectItem value="ROUTINE">{getTaskTypeLabel('ROUTINE')}</SelectItem>
                <SelectItem value="OTHER">{getTaskTypeLabel('OTHER')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="workflow-mode">Workflow View</Label>
            <Select
              value={isModerationMode ? 'MODERATION' : 'STANDARD'}
              onValueChange={(value) => onWorkflowModeChange(value as 'STANDARD' | 'MODERATION')}
            >
              <SelectTrigger id="workflow-mode"><SelectValue placeholder="Select workflow view" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="STANDARD">Standard checklist</SelectItem>
                <SelectItem value="MODERATION">Loop-based moderation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="client-select">Client Mapping (Optional)</Label>
            <AsyncCombobox
              value={template.client_id || ''}
              onChange={onClientChange}
              onSearch={onClientSearch}
              options={clientOptions}
              isLoading={isClientsLoading}
              placeholder="Studio scoped — select client to bind"
            />
            <span className="text-[11px] text-muted-foreground">
              Binding a template to a client allows restricting the mechanic catalog items and rules for that client.
            </span>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
