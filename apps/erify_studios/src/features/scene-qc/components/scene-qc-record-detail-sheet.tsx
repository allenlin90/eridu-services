import type { SceneQcRecordDetail } from '@eridu/api-types/scene-qc';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@eridu/ui';
import { useIsMobile } from '@eridu/ui/hooks/use-is-mobile';

import { SceneQcRecordDetailContent } from './scene-qc-record-detail-content';

type SceneQcRecordDetailSheetProps = {
  open: boolean;
  detail: SceneQcRecordDetail | undefined;
  isLoading: boolean;
  isError: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenReport: (confirmationId: string) => void;
};

/** Desktop `Sheet` / mobile `Drawer`, switched by `useIsMobile()` (§7.5). */
export function SceneQcRecordDetailSheet({ open, detail, isLoading, isError, onOpenChange, onOpenReport }: SceneQcRecordDetailSheetProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="flex h-[100dvh] max-h-[100dvh] flex-col">
          <DrawerHeader className="border-b text-left">
            <DrawerTitle>{detail?.show.name ?? 'Scene QC Record'}</DrawerTitle>
            <DrawerDescription className="sr-only">Read-only Scene QC record detail.</DrawerDescription>
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
            <SceneQcRecordDetailContent detail={detail} isLoading={isLoading} isError={isError} onOpenReport={onOpenReport} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{detail?.show.name ?? 'Scene QC Record'}</SheetTitle>
          <SheetDescription className="sr-only">Read-only Scene QC record detail.</SheetDescription>
        </SheetHeader>
        <SceneQcRecordDetailContent detail={detail} isLoading={isLoading} isError={isError} onOpenReport={onOpenReport} />
      </SheetContent>
    </Sheet>
  );
}
