import type { Show } from "@/erify/types";

import { useRemoveShow } from "@/erify/admin/shows/hooks/use-remove-show";
import { useRowActionStore } from "@/erify/admin/shows/stores/use-row-action-store";
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

type RemoveShowDialogProps = {
  show: Show | null;
} & React.ComponentProps<typeof AlertDialog>;

export const RemoveShowDialog: React.FC<RemoveShowDialogProps> = ({ show, ...props }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { closeDialog } = useRowActionStore();
  const { isPending, mutateAsync } = useRemoveShow({
    onSuccess: (_data, id) => {
      toast({
        variant: "success",
        description: `Show ${show?.name ?? show?.id ?? id} is removed`,
      });
      queryClient.invalidateQueries({ queryKey: ["erify_shows"] });
      closeDialog();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: error.response?.data?.message || "something went wrong",
      });
    },
  });

  const onConfirm = useCallback((show: Show) =>
    async (_e: React.MouseEvent<HTMLButtonElement>) => {
      await mutateAsync(show);
    }, [mutateAsync]);

  if (!show)
    return null;

  return (
    <AlertDialog {...props}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove show</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove
            {" "}
            {show.name}
            {" "}
            of
            {" "}
            {show.client_id}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={onConfirm(show)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
