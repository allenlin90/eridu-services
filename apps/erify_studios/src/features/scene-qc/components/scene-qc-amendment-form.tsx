import { useState } from 'react';
import { toast } from 'sonner';

import type { SceneQcFindingInput, SceneQcResult, SceneType } from '@eridu/api-types/scene-qc';
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@eridu/ui';

import { useAppendSceneQcAmendment } from '../api/append-scene-qc-amendment';
import { useSceneQcTaxonomyQuery } from '../api/get-scene-qc-taxonomy';

import { SceneQcIssuePicker } from './scene-qc-issue-picker';
import { SceneQcTaxonomyDialog } from './scene-qc-taxonomy-dialog';

type Props = {
  studioId: string;
  reviewId: string;
  sceneType: SceneType | null;
  onCancel: () => void;
};

export function SceneQcAmendmentForm({ studioId, reviewId, sceneType, onCancel }: Props) {
  const [result, setResult] = useState<SceneQcResult | null>(null);
  const [note, setNote] = useState('');
  const [findings, setFindings] = useState<SceneQcFindingInput[]>([]);
  const [taxonomyOpen, setTaxonomyOpen] = useState(false);
  const taxonomy = useSceneQcTaxonomyQuery(studioId);
  const mutation = useAppendSceneQcAmendment(studioId, reviewId);
  const findingsMissing = (result === 'MINOR' || result === 'FAIL') && findings.length === 0;

  const submit = async () => {
    if (!note.trim() || findingsMissing)
      return;
    try {
      await mutation.mutateAsync({ note: note.trim(), result, findings });
      toast.success(result ? 'Correction appended.' : 'Comment appended.');
      onCancel();
    } catch {
      toast.error('Unable to append this entry.');
    }
  };

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="space-y-1">
        <Label>Entry type</Label>
        <Select
          value={result ?? 'COMMENT'}
          onValueChange={(value) => {
            const next = value === 'COMMENT' ? null : value as SceneQcResult;
            setResult(next);
            if (next === null || next === 'PASS')
              setFindings([]);
          }}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="COMMENT">Comment only</SelectItem>
            <SelectItem value="PASS">Correct result to Pass</SelectItem>
            <SelectItem value="MINOR">Correct result to Minor</SelectItem>
            <SelectItem value="FAIL">Correct result to Fail</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {result === 'MINOR' || result === 'FAIL'
        ? (
            <SceneQcIssuePicker
              taxonomy={taxonomy.data}
              sceneType={sceneType}
              findings={findings}
              onChange={setFindings}
              onManage={() => setTaxonomyOpen(true)}
              missing={findingsMissing}
            />
          )
        : null}

      <div className="space-y-1">
        <Label>Reason or comment</Label>
        <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Explain the correction or add context" />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="button" disabled={!note.trim() || findingsMissing || mutation.isPending} onClick={() => void submit()}>
          Append
        </Button>
      </div>

      {taxonomyOpen
        ? (
            <SceneQcTaxonomyDialog
              studioId={studioId}
              taxonomy={taxonomy.data}
              open
              onOpenChange={setTaxonomyOpen}
            />
          )
        : null}
    </div>
  );
}
