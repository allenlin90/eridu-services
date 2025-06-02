import type { Material } from "@/erify/types";

import { useRemoveMaterial } from "@/erify/admin/materials/hooks/use-remove-material";
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

type RemoveMaterialDialogProps = {
  material: Material | null;
} & React.ComponentProps<typeof AlertDialog>;

export const RemoveMaterialDialog: React.FC<RemoveMaterialDialogProps> = ({ material, ...props }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isPending, mutateAsync } = useRemoveMaterial({
    onSuccess: () => {
      toast({
        title: "Material removed",
        description: `Material ${material?.name ?? material?.id} is removed.`,
      });
      queryClient.invalidateQueries({ queryKey: ["erify_materials"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove material",
        description: error?.message || "Unknown error",
      });
    },
  });

  const onConfirm = useCallback((material: Material) =>
    async (_e: React.MouseEvent<HTMLButtonElement>) => {
      await mutateAsync(material);
    }, [mutateAsync]);

  if (!material) {
    return null;
  }

  return (
    <AlertDialog {...props}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Material</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove
            {" "}
            <b>{material?.name}</b>
            ?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm(material)}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
