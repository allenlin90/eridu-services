import { useMemo, useState } from 'react';

import {
  AsyncCombobox,
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

import { useMembershipsQuery } from '@/features/memberships/api/get-memberships';
import type { ShowSelection } from '@/features/studio-shows/api/get-studio-shows';
import { useAssignShows } from '@/features/studio-shows/hooks/use-assign-shows';

type ShowAssignmentDialogProps = {
  studioId: string;
  shows: ShowSelection[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function ShowAssignmentDialog({
  studioId,
  shows,
  open,
  onOpenChange,
  onSuccess,
}: ShowAssignmentDialogProps) {
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [memberSearch, setMemberSearch] = useState('');
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedAssignee('');
      setMemberSearch('');
      setConfirmOverwrite(false);
    }
    onOpenChange(nextOpen);
  };

  // Fetch studio members (up to 100 for the dropdown)
  const { data: membersResponse, isLoading: isLoadingMembers } = useMembershipsQuery({
    studio_id: studioId,
    limit: 100,
  });

  const rawMembers = membersResponse?.data;
  const members = useMemo(() => rawMembers ?? [], [rawMembers]);

  const { mutate: assignShows, isPending: isAssigning } = useAssignShows({
    studioId,
    onSuccess: () => {
      handleOpenChange(false);
      onSuccess?.();
    },
  });

  const memberOptions = useMemo(() => {
    return members.map((m) => ({
      value: m.user.id,
      label: `${m.user.name} (${m.user.email})`,
    }));
  }, [members]);

  const filteredOptions = useMemo(() => {
    if (!memberSearch)
      return memberOptions;
    return memberOptions.filter((o) =>
      o.label.toLowerCase().includes(memberSearch.toLowerCase()),
    );
  }, [memberOptions, memberSearch]);

  const overwriteShowsCount = useMemo(
    () => shows.filter((show) => show.task_summary.assigned > 0).length,
    [shows],
  );
  const showsWithoutTasksCount = useMemo(
    () => shows.filter((show) => show.task_summary.total === 0).length,
    [shows],
  );
  const overwriteTasksCount = useMemo(
    () => shows.reduce((total, show) => total + show.task_summary.assigned, 0),
    [shows],
  );
  const requiresOverwriteConfirmation = overwriteShowsCount > 0;
  const hasNoAssignableTasks = showsWithoutTasksCount === shows.length;

  const handleAssign = () => {
    if (!selectedAssignee || shows.length === 0 || hasNoAssignableTasks)
      return;
    if (requiresOverwriteConfirmation && !confirmOverwrite)
      return;

    assignShows({
      show_uids: shows.map((s) => s.id),
      assignee_uid: selectedAssignee,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Assign Tasks for
            {' '}
            {shows.length}
            {' '}
            Show(s)
          </DialogTitle>
          <DialogDescription>
            Select a studio member to assign all tasks for the selected shows.
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
                  <AsyncCombobox
                    value={selectedAssignee}
                    onChange={setSelectedAssignee}
                    onSearch={setMemberSearch}
                    options={filteredOptions}
                    placeholder="Search a studio member..."
                  />
                )}
          </div>

          {requiresOverwriteConfirmation && (
            <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-900">
                This action will overwrite existing assignees on
                {' '}
                {overwriteTasksCount}
                {' '}
                task(s) across
                {' '}
                {overwriteShowsCount}
                {' '}
                selected show(s).
              </p>
              <label className="flex items-center gap-2 text-sm text-amber-900">
                <Checkbox
                  checked={confirmOverwrite}
                  onCheckedChange={(checked) => setConfirmOverwrite(Boolean(checked))}
                />
                I understand existing assignees will be overwritten.
              </label>
            </div>
          )}

          {showsWithoutTasksCount > 0 && (
            <div className="space-y-2 rounded-md border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm text-blue-900">
                {hasNoAssignableTasks
                  ? 'No generated tasks were found for the selected show(s). Generate tasks first, then assign.'
                  : `${showsWithoutTasksCount} selected show(s) have no generated tasks and will be skipped.`}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isAssigning}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={
              isAssigning
              || !selectedAssignee
              || hasNoAssignableTasks
              || (requiresOverwriteConfirmation && !confirmOverwrite)
            }
          >
            {isAssigning ? 'Assigning...' : 'Assign Tasks'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
