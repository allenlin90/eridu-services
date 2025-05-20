import type { Studio } from "@/erify/types";

import { useRemoveStudio } from "@/erify/admin/studios/hooks/use-remove-studio";
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

type RemoveStudioDialogProps = {
  studio: Studio | null;
} & React.ComponentProps<typeof AlertDialog>;

export const RemoveStudioDialog: React.FC<RemoveStudioDialogProps> = ({ studio, ...props }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isPending, mutateAsync } = useRemoveStudio({
    onSuccess: (studio) => {
      toast({
        variant: "success",
        description: `Studio ${studio?.name ?? studio?.uid} is removed`,
      });
      queryClient.invalidateQueries({ queryKey: ["studios"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: error.response?.data.message || "something went wrong",
      });
    },
  });

  const onConfirm = useCallback((studio: Studio) =>
    async (_e: React.MouseEvent<HTMLButtonElement>) => {
      await mutateAsync(studio);
    }, [mutateAsync]);

  if (!studio) {
    return null;
  }

  return (
    <AlertDialog {...props}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove studio</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove
            {" "}
            {studio.name}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={onConfirm(studio)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
