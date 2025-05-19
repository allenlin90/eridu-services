import type { Brand } from "@/erify/types";

import { useRemoveBrand } from "@/erify/admin/brands/hooks/use-remove-brand";
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

type RemoveBrandDialogProps = {
  brand: Brand | null;
} & React.ComponentProps<typeof AlertDialog>;

export const RemoveBrandDialog: React.FC<RemoveBrandDialogProps> = ({ brand, ...props }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isPending, mutateAsync } = useRemoveBrand({
    onSuccess: (brand) => {
      toast({
        variant: "success",
        description: `Brand ${brand?.name ?? brand?.uid} is removed`,
      });
      queryClient.invalidateQueries({ queryKey: ["brands"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: error.response?.data.message || "something went wrong",
      });
    },
  });

  const onConfirm = useCallback((brand: Brand) =>
    async (_e: React.MouseEvent<HTMLButtonElement>) => {
      await mutateAsync(brand);
    }, [mutateAsync]);

  if (!brand) {
    return null;
  }

  return (
    <AlertDialog {...props}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove brand</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove
            {" "}
            {brand.name}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={onConfirm(brand)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
