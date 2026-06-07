import type { ReactNode } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@eridu/ui';
import { useIsMobile } from '@eridu/ui/hooks/use-is-mobile';
import { cn } from '@eridu/ui/lib/utils';

type ResponsiveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  contentClassName?: string;
  mobileBodyClassName?: string;
};

export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  contentClassName,
  mobileBodyClassName,
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile();
  // When no description is rendered, explicitly pass aria-describedby={undefined} to suppress the
  // Radix "Missing Description" warning. When a description IS rendered we omit the prop entirely so
  // Radix keeps its auto-generated association — passing undefined here would drop it and break a11y.
  const describedByProps = description ? {} : { 'aria-describedby': undefined };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent {...describedByProps}>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            {description ? <DrawerDescription>{description}</DrawerDescription> : null}
          </DrawerHeader>
          <div className={cn('max-h-[72vh] overflow-y-auto px-4', mobileBodyClassName)}>
            {children}
          </div>
          {footer ? <DrawerFooter>{footer}</DrawerFooter> : null}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={contentClassName} {...describedByProps}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
