import { Trash2 } from 'lucide-react';
import { useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Spinner,
} from '@eridu/ui';

import type { ShowCreator } from '../api/get-show-creators';

type ShowCreatorListProps = {
  mcs: ShowCreator[];
  isLoading: boolean;
  onRemove: (mcId: string) => void;
  isRemoving: boolean;
};

export function ShowCreatorList({ mcs, isLoading, onRemove, isRemoving }: ShowCreatorListProps) {
  const [confirmCreatorId, setConfirmCreatorId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (mcs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No creators assigned to this show.
      </p>
    );
  }

  return (
    <>
      <ul className="divide-y">
        {mcs.map((mc) => (
          <li key={mc.id} className="flex items-center justify-between py-3 px-1">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">{mc.mc_name ?? mc.mc_id}</span>
              {mc.mc_alias_name && (
                <span className="text-xs text-muted-foreground ml-2">
                  (
                  {mc.mc_alias_name}
                  )
                </span>
              )}
              {mc.compensation_type && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {mc.compensation_type}
                </Badge>
              )}
              {mc.agreed_rate && (
                <span className="text-xs text-muted-foreground ml-2">
                  Rate:
                  {' '}
                  {mc.agreed_rate}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setConfirmCreatorId(mc.mc_id)}
              disabled={isRemoving}
              aria-label={`Remove ${mc.mc_name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>

      <AlertDialog open={confirmCreatorId !== null} onOpenChange={(open) => !open && setConfirmCreatorId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove creator from show?</AlertDialogTitle>
            <AlertDialogDescription>
              This creator will be removed from this show. You can re-assign them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmCreatorId) {
                  onRemove(confirmCreatorId);
                  setConfirmCreatorId(null);
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
