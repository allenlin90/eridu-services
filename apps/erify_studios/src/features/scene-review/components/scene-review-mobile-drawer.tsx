import type { SceneReviewDetail as SceneReviewDetailDto } from '@eridu/api-types/task-management';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@eridu/ui';

import { SceneReviewDetail } from './scene-review-detail';

import * as m from '@/paraglide/messages';

type SceneReviewMobileDrawerProps = {
  open: boolean;
  detail?: SceneReviewDetailDto;
  isLoading: boolean;
  isError: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SceneReviewMobileDrawer({
  open,
  detail,
  isLoading,
  isError,
  onOpenChange,
}: SceneReviewMobileDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[100dvh] max-h-[100dvh]">
        <DrawerHeader className="sr-only">
          <DrawerTitle>{m.scene_review_title()}</DrawerTitle>
          <DrawerDescription>{m.scene_review_description()}</DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <SceneReviewDetail detail={detail} isLoading={isLoading} isError={isError} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
