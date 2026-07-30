import { Plus, Settings2, Trash2 } from 'lucide-react';

import type {
  SceneQcFindingInput,
  SceneQcTaxonomy,
  SceneType,
} from '@eridu/api-types/scene-qc';
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eridu/ui';

type SceneQcIssuePickerProps = {
  taxonomy: SceneQcTaxonomy | undefined;
  sceneType: SceneType | null;
  findings: SceneQcFindingInput[];
  onChange: (findings: SceneQcFindingInput[]) => void;
  onManage: () => void;
  missing: boolean;
};

export function SceneQcIssuePicker({
  taxonomy,
  sceneType,
  findings,
  onChange,
  onManage,
  missing,
}: SceneQcIssuePickerProps) {
  const elements = (taxonomy?.elements ?? []).filter(
    (element) => sceneType && element.applies_to.includes(sceneType),
  );

  const addFinding = () => {
    const element = elements.find((candidate) => candidate.defects.length > 0);
    const defect = element?.defects[0];
    if (!element || !defect) {
      return;
    }
    onChange([...findings, { element_id: element.id, defect_id: defect.id }]);
  };

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Label>Issues</Label>
          <p className="text-xs text-muted-foreground">Choose where the problem is and what is wrong.</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onManage}>
          <Settings2 className="mr-2 h-4 w-4" />
          Manage options
        </Button>
      </div>

      {!sceneType
        ? <p className="text-sm text-amber-700">Set a Scene Profile type before tagging an issue.</p>
        : elements.length === 0
          ? <p className="text-sm text-muted-foreground">No issue options apply to this scene type.</p>
          : null}

      {findings.map((finding, index) => {
        const selectedElement = elements.find((element) => element.id === finding.element_id);
        const selectedDefect = selectedElement?.defects.find((defect) => defect.id === finding.defect_id);
        return (
          <div key={`${finding.element_id}:${finding.defect_id}:${finding.related_element_id ?? ''}`} className="grid gap-2 rounded-md bg-muted/30 p-2 sm:grid-cols-[1fr_1fr_auto]">
            <Select
              value={finding.element_id}
              onValueChange={(elementId) => {
                const element = elements.find((candidate) => candidate.id === elementId);
                const defect = element?.defects[0];
                if (!defect)
                  return;
                onChange(findings.map((item, itemIndex) => itemIndex === index
                  ? { element_id: elementId, defect_id: defect.id }
                  : item));
              }}
            >
              <SelectTrigger aria-label={`Issue ${index + 1} element`}><SelectValue /></SelectTrigger>
              <SelectContent>
                {elements.filter((element) => element.defects.length > 0).map((element) => (
                  <SelectItem key={element.id} value={element.id}>{element.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={finding.defect_id}
              onValueChange={(defectId) => onChange(findings.map((item, itemIndex) => itemIndex === index
                ? { ...item, defect_id: defectId, related_element_id: undefined }
                : item))}
            >
              <SelectTrigger aria-label={`Issue ${index + 1} type`}><SelectValue /></SelectTrigger>
              <SelectContent>
                {(selectedElement?.defects ?? []).map((defect) => (
                  <SelectItem key={defect.id} value={defect.id}>{defect.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={`Remove issue ${index + 1}`}
              onClick={() => onChange(findings.filter((_, itemIndex) => itemIndex !== index))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            {selectedDefect?.key === 'overlap'
              ? (
                  <div className="sm:col-span-2">
                    <Select
                      value={finding.related_element_id ?? ''}
                      onValueChange={(relatedElementId) => onChange(findings.map((item, itemIndex) => itemIndex === index
                        ? { ...item, related_element_id: relatedElementId }
                        : item))}
                    >
                      <SelectTrigger aria-label={`Issue ${index + 1} related element`}>
                        <SelectValue placeholder="Overlaps with…" />
                      </SelectTrigger>
                      <SelectContent>
                        {elements.filter((element) => element.id !== finding.element_id).map((element) => (
                          <SelectItem key={element.id} value={element.id}>{element.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              : null}
          </div>
        );
      })}

      <Button type="button" size="sm" variant="secondary" disabled={!sceneType || elements.length === 0} onClick={addFinding}>
        <Plus className="mr-2 h-4 w-4" />
        Add issue
      </Button>
      {missing ? <p className="text-xs text-destructive">Add at least one issue for Minor and Fail.</p> : null}
    </div>
  );
}
