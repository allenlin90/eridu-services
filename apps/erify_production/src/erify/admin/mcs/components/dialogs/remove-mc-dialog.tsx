import type { MC } from "@/erify/types";

import { useRemoveMc } from "@/erify/admin/mcs/hooks/use-remove-mc";
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

type RemoveMcDialogProps = {
  mc: MC | null;
} & React.ComponentProps<typeof AlertDialog>;

export const RemoveMcDialog: React.FC<RemoveMcDialogProps> = ({ mc, ...props }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isPending, mutateAsync } = useRemoveMc({
    onSuccess: (mc) => {
      toast({
        variant: "success",
        description: `MC ${mc?.name ?? mc?.uid} is removed`,
      });
      queryClient.invalidateQueries({ queryKey: ["mcs"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: error.response?.data.message || "something went wrong",
      });
    },
  });

  const onConfirm = useCallback((mc: MC) =>
    async (_e: React.MouseEvent<HTMLButtonElement>) => {
      await mutateAsync(mc);
    }, [mutateAsync]);

  if (!mc) {
    return null;
  }

  return (
    <AlertDialog {...props}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove mc</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove
            {" "}
            {mc.name}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={onConfirm(mc)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
