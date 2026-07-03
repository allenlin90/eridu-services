import { Link } from '@tanstack/react-router';
import { ArrowLeft, Clock } from 'lucide-react';

import { SYSTEM_FACT_KEY_DEFINITIONS, type SystemFactKey } from '@eridu/api-types/task-management';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@eridu/ui';

import type { BuilderTemplateSchemaType } from './schema';

import { getTaskTypeLabel } from '@/lib/constants/task-type-labels';

type TaskTemplatePreviewProps = {
  template: BuilderTemplateSchemaType;
  studioId: string;
};

export function TaskTemplatePreview({ template, studioId }: TaskTemplatePreviewProps) {
  const isModerationMode
    = template.items.some((item) => !!item.group) || (template.metadata?.loops?.length ?? 0) > 0;

  const loops = template.metadata?.loops ?? [];

  // Group fields by group (loop id)
  const globalFields = template.items.filter((item) => !item.group);
  const loopFieldsRecord = template.items.reduce<Record<string, typeof template.items>>((acc, item) => {
    if (item.group) {
      if (!acc[item.group]) {
        acc[item.group] = [];
      }
      acc[item.group].push(item);
    }
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top back navigation */}
      <div className="flex items-center justify-between border-b pb-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/studios/$studioId/task-templates" params={{ studioId }} search={{ page: 1, limit: 10 }}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Link>
        </Button>
        <Badge variant="secondary" className="px-3 py-1 font-semibold uppercase">
          Read Only
        </Badge>
      </div>

      {/* Main Metadata Card */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl md:text-2xl font-bold">{template.name}</CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-2">
                {template.description || 'No description provided.'}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="px-2.5 py-1 text-xs">
                {isModerationMode ? 'Moderation' : 'Standard'}
              </Badge>
              <Badge variant="secondary" className="px-2.5 py-1 text-xs">
                {getTaskTypeLabel(template.task_type)}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Moderation Loops Overview */}
      {isModerationMode && loops.length > 0 && (
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Moderation Loops (
              {loops.length}
              )
            </CardTitle>
            <CardDescription>
              Loops defined in the moderation structure and their durations.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {loops.map((loop) => (
              <div key={loop.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                <span className="font-medium text-sm truncate">{loop.name}</span>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {loop.durationMin}
                  {' '}
                  mins
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Global Fields / Standard Fields List */}
      {globalFields.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">
            {isModerationMode ? 'Global Fields' : 'Template Fields'}
          </h3>
          <div className="space-y-3">
            {globalFields.map((field, idx) => (
              <FieldPreviewCard key={field.id} field={field} index={idx} />
            ))}
          </div>
        </div>
      )}

      {/* Grouped Loop Fields */}
      {isModerationMode
      && loops.map((loop) => {
        const fields = loopFieldsRecord[loop.id] ?? [];
        return (
          <div key={loop.id} className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2 flex items-center justify-between">
              <span>{loop.name}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {fields.length}
                {' '}
                {fields.length === 1 ? 'field' : 'fields'}
              </span>
            </h3>
            {fields.length > 0
              ? (
                  <div className="space-y-3">
                    {fields.map((field, idx) => (
                      <FieldPreviewCard key={field.id} field={field} index={idx} />
                    ))}
                  </div>
                )
              : (
                  <p className="text-sm text-muted-foreground italic pl-4">No fields in this loop.</p>
                )}
          </div>
        );
      })}
    </div>
  );
}

function FieldPreviewCard({ field, index }: { field: any; index: number }) {
  // Check if V1 standard or V2 shared_field_key is present
  const isShared = field.standard === true || !!field.shared_field_key;
  const sharedKey = field.shared_field_key || (field.standard === true ? field.key : undefined);

  // Get system fact definition
  const systemFactKey = field.system_fact_key as SystemFactKey | undefined;
  const systemFactDefinition = systemFactKey ? SYSTEM_FACT_KEY_DEFINITIONS[systemFactKey] : undefined;

  return (
    <Card className="border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 transition-colors">
      <CardHeader className="p-4 pb-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            <h4 className="font-medium text-sm md:text-base flex items-start gap-2">
              <span className="text-muted-foreground font-semibold">
                {index + 1}
                .
              </span>
              <span>{field.label}</span>
            </h4>
            {field.description && (
              <p className="text-xs text-muted-foreground pl-5">{field.description}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 uppercase font-mono">
              {field.type}
            </Badge>
            {field.required && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-slate-100 text-slate-500 border border-slate-200">
                Required
              </Badge>
            )}
            {isShared && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-blue-50 text-blue-600 border border-blue-100 font-medium">
                Shared:
                {' '}
                {sharedKey}
              </Badge>
            )}
            {systemFactDefinition && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 font-medium">
                Auto-fill:
                {' '}
                {systemFactDefinition.label}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 border-t bg-slate-50/50 dark:bg-slate-900/10 text-xs text-muted-foreground space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono">
          <div>
            <span className="font-semibold text-slate-500">Field ID: </span>
            <span className="text-foreground">{field.id}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-500">Field Key: </span>
            <span className="text-foreground">{field.key}</span>
          </div>
        </div>

        {/* Options for list/choice type fields */}
        {field.options && field.options.length > 0 && (
          <div className="pt-2 border-t mt-2">
            <span className="font-semibold text-slate-500 font-mono">Options: </span>
            <div className="flex flex-wrap gap-2 mt-1.5 font-sans">
              {field.options.map((opt: any) => (
                <Badge key={opt.value} variant="outline" className="text-[10px] bg-white border-slate-200 text-slate-700">
                  {opt.label}
                  {' '}
                  (
                  {opt.value}
                  )
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
