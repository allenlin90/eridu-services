import type { Platform } from "@/erify/types";

import { useRemovePlatform } from "@/erify/admin/platforms/hooks/use-remove-platform";
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

type RemovePlatformDialogProps = {
  cancel?: () => void | Promise<void>;
  platform: Platform | null;
} & React.ComponentProps<typeof AlertDialog>;

export const RemovePlatformDialog: React.FC<RemovePlatformDialogProps> = ({ cancel, platform, ...props }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useRemovePlatform({
    onSuccess: (platform) => {
      toast({
        variant: "success",
        description: `Platform ${platform?.name} has been removed.`,
      });
      cancel?.();
      queryClient.invalidateQueries({ queryKey: ["platforms"] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        description: "Failed to remove the platform.",
      });
    },
  });

  const onConfirm = useCallback((platform: Platform) =>
    async (_e: React.MouseEvent<HTMLButtonElement>) => {
      await mutateAsync(platform);
    }, [mutateAsync]);

  if (!platform) {
    return null;
  }

  return (
    <AlertDialog {...props}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Platform</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove the platform:
            {" "}
            {platform.name}
            ?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm(platform)}
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
