import { AlertCircle } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from '@eridu/ui';

import { LivePreview } from './live-preview';
import type { BuilderTemplateSchemaType } from './schema';

/** Renders save-time validation messages above the editor. */
export function BuilderValidationErrors({ errors }: { errors?: Record<string, string[]> }) {
  if (!errors || Object.keys(errors).length === 0)
    return null;
  return (
    <div className="px-1">
      <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-sm">Validation Errors</p>
          <div className="text-xs mt-1 text-destructive/90">
            Please correct the issues below before saving.
            <ul className="list-disc list-inside mt-2 space-y-1">
              {Object.entries(errors).flatMap(([path, messages]) => messages.map((message) => (
                <li key={`${path}-${message}`}>{message}</li>
              )))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Renders editor actions and the discard confirmation dialog. */
export function BuilderActions(props: {
  template: BuilderTemplateSchemaType;
  isSaving?: boolean;
  showCancelAlert: boolean;
  onCancelAlertChange: (open: boolean) => void;
  onSave?: (template: BuilderTemplateSchemaType) => void;
  onCancel?: () => void;
}) {
  const { template, isSaving, showCancelAlert, onCancelAlertChange, onSave, onCancel } = props;
  return (
    <>
      <div className="flex items-center justify-between pt-4 border-t mt-4">
        <Button variant="outline" onClick={() => onCancelAlertChange(true)}>Cancel</Button>
        <Button onClick={() => onSave?.(template)} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Template'}
        </Button>
      </div>
      <AlertDialog open={showCancelAlert} onOpenChange={onCancelAlertChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear your current draft and all unsaved changes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={onCancel}
              className="bg-destructive hover:bg-destructive/90"
            >
              Discard Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Renders the deferred desktop preview column. */
export function BuilderLivePreview({ template }: { template: BuilderTemplateSchemaType }) {
  return (
    <div className="hidden lg:flex min-h-0 flex-col bg-muted/30 rounded-lg border overflow-hidden">
      <div className="p-4 border-b bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <h3 className="font-medium flex items-center">
          <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
          Live Preview
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <LivePreview template={template} />
      </div>
    </div>
  );
}
