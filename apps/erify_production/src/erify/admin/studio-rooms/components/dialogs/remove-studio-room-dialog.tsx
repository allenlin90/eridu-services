import type { StudioRoom } from "@/erify/types";

import { useRemoveStudioRoom } from "@/erify/admin/studio-rooms/hooks/use-remove-studio-room";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@eridu/ui/components/alert-dialog";
import { useToast } from "@eridu/ui/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

type RemoveStudioRoomDialogProps = {
  cancel?: () => void | Promise<void>;
  studioRoom: StudioRoom | null;
} & React.ComponentProps<typeof AlertDialog>;

export const RemoveStudioRoomDialog: React.FC<RemoveStudioRoomDialogProps> = ({ cancel, studioRoom, ...props }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useRemoveStudioRoom({
    onSuccess: (studioRoom) => {
      toast({
        variant: "success",
        description: `Studio Room ${studioRoom?.name} has been removed.`,
      });
      cancel?.();
      queryClient.invalidateQueries({ queryKey: ["studio_rooms"] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        description: "Failed to remove the studio room.",
      });
    },
  });

  const onConfirm = useCallback((studioRoom: StudioRoom) =>
    async (_e: React.MouseEvent<HTMLButtonElement>) => {
      await mutateAsync(studioRoom);
    }, [mutateAsync]);

  if (!studioRoom) {
    return null;
  }

  return (
    <AlertDialog {...props}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Studio Room</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove the studio room:
            {" "}
            {studioRoom.name}
            ?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm(studioRoom)}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
