import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { SceneQcTaxonomy } from '@eridu/api-types/scene-qc';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eridu/ui';

import {
  useCreateSceneQcTaxonomyDefect,
  useCreateSceneQcTaxonomyElement,
  useRetireSceneQcTaxonomyEntry,
} from '../api/get-scene-qc-taxonomy';

import { ResponsiveDialog } from '@/components/responsive-dialog';

type SceneQcTaxonomyDialogProps = {
  studioId: string;
  taxonomy: SceneQcTaxonomy | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SceneQcTaxonomyDialog({
  studioId,
  taxonomy,
  open,
  onOpenChange,
}: SceneQcTaxonomyDialogProps) {
  const [elementLabel, setElementLabel] = useState('');
  const [defectLabel, setDefectLabel] = useState('');
  const [elementId, setElementId] = useState('');
  const createElement = useCreateSceneQcTaxonomyElement(studioId);
  const createDefect = useCreateSceneQcTaxonomyDefect(studioId);
  const retire = useRetireSceneQcTaxonomyEntry(studioId);
  const elements = taxonomy?.elements ?? [];

  const addElement = async () => {
    if (!elementLabel.trim())
      return;
    try {
      await createElement.mutateAsync({
        label: elementLabel.trim(),
        applies_to: ['GRAPHIC_BG', 'REAL_BACKDROP'],
      });
      setElementLabel('');
      toast.success('Issue element added for all Scene QC reviewers.');
    } catch {
      toast.error('Unable to add the issue element.');
    }
  };

  const addDefect = async () => {
    if (!defectLabel.trim() || !elementId)
      return;
    try {
      await createDefect.mutateAsync({ element_id: elementId, label: defectLabel.trim() });
      setDefectLabel('');
      toast.success('Issue type added for all Scene QC reviewers.');
    } catch {
      toast.error('Unable to add the issue type.');
    }
  };

  const retireEntry = async (kind: 'elements' | 'defects', id: string) => {
    try {
      await retire.mutateAsync({ kind, id });
      toast.success('Option removed from future reviews. Past records are unchanged.');
    } catch {
      toast.error('Unable to remove this option.');
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Manage Scene QC issue options"
      description="These options are shared across the organization. Built-in options stay protected; custom options can be removed from future reviews."
      contentClassName="max-w-3xl"
    >
      <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
        <section className="space-y-2">
          <Label>Add an element</Label>
          <p className="text-xs text-muted-foreground">An element answers “where is the problem?” and applies to both scene types by default.</p>
          <div className="flex gap-2">
            <Input value={elementLabel} onChange={(event) => setElementLabel(event.target.value)} placeholder="e.g. Microphone" />
            <Button type="button" onClick={() => void addElement()} disabled={!elementLabel.trim() || createElement.isPending}>
              Add
            </Button>
          </div>
        </section>

        <section className="space-y-2">
          <Label>Add an issue type</Label>
          <p className="text-xs text-muted-foreground">An issue type answers “what is wrong?” for one element.</p>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Select value={elementId} onValueChange={setElementId}>
              <SelectTrigger><SelectValue placeholder="Choose element" /></SelectTrigger>
              <SelectContent>
                {elements.map((element) => <SelectItem key={element.id} value={element.id}>{element.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={defectLabel} onChange={(event) => setDefectLabel(event.target.value)} placeholder="e.g. Muffled audio" />
            <Button
              type="button"
              onClick={() => void addDefect()}
              disabled={!elementId || !defectLabel.trim() || createDefect.isPending}
            >
              Add
            </Button>
          </div>
        </section>

        <section className="space-y-2">
          <Label>Available options</Label>
          <div className="divide-y rounded-md border">
            {elements.map((element) => (
              <div key={element.id} className="space-y-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{element.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {element.applies_to.map((type) => type === 'GRAPHIC_BG' ? 'Graphic BG' : 'Real Backdrop').join(' · ')}
                    </p>
                  </div>
                  {!element.is_system
                    ? (
                        <Button type="button" size="icon" variant="ghost" aria-label={`Remove ${element.label}`} onClick={() => void retireEntry('elements', element.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )
                    : null}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {element.defects.map((defect) => (
                    <span key={defect.id} className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs">
                      {defect.label}
                      {!defect.is_system
                        ? (
                            <button type="button" aria-label={`Remove ${defect.label}`} onClick={() => void retireEntry('defects', defect.id)}>
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )
                        : null}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </ResponsiveDialog>
  );
}
