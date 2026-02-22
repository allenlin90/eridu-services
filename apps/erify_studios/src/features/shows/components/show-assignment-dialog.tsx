import { useParams } from '@tanstack/react-router';
import { useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@eridu/ui';

import { useMembershipsQuery } from '@/features/memberships/api/get-memberships';
import type { StudioShow } from '@/features/studio-shows/api/get-studio-shows';
import { useAssignShows } from '@/features/studio-shows/hooks/use-assign-shows';

type ShowAssignmentDialogProps = {
  shows: StudioShow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ShowAssignmentDialog({ shows, open, onOpenChange }: ShowAssignmentDialogProps) {
  const { studioId } = useParams({ strict: false }) as { studioId: string };
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');

  // Fetch studio members (up to 100 for the dropdown)
  const { data: membersResponse, isLoading: isLoadingMembers } = useMembershipsQuery({
    studio_id: studioId,
    limit: 100,
  });

  const members = membersResponse?.data ?? [];

  const { mutate: assignShows, isPending: isAssigning } = useAssignShows({
    studioId,
    onSuccess: () => {
      onOpenChange(false);
      setSelectedAssignee('');
    },
  });

  const handleAssign = () => {
    if (!selectedAssignee || shows.length === 0)
      return;

    assignShows({
      show_uids: shows.map((s) => s.id),
      assignee_uid: selectedAssignee,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            Assign Tasks for
            {' '}
            {shows.length}
            {' '}
            Show(s)
          </DialogTitle>
          <DialogDescription>
            Select a studio member to assign all unassigned tasks to for the selected shows.
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

          <div className="space-y-2 mt-2">
            <p className="text-sm font-medium">Assignee</p>
            {isLoadingMembers
              ? (
                  <Skeleton className="h-9 w-full" />
                )
              : (
                  <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a studio member..." />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.user.id} value={member.user.id}>
                          {member.user.name}
                          {' '}
                          (
                          {member.user.email}
                          )
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAssigning}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={isAssigning || !selectedAssignee}
          >
            {isAssigning ? 'Assigning...' : 'Assign Tasks'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
