import { Download } from 'lucide-react';
import { useState } from 'react';

import {
  Button,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@eridu/ui';
import { useIsMobile } from '@eridu/ui/hooks/use-is-mobile';

import { downloadSceneQcReportCsv } from '../api/download-scene-qc-report-csv';
import { useSceneQcReportQuery } from '../api/get-scene-qc-report';

import { SceneQcReportView } from './scene-qc-report-view';

type SceneQcReportSheetProps = {
  studioId: string;
  confirmationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Sheet/Drawer wrapper for "Open report" (§7.6). Read-only; the report
 * itself carries the prominent STALE/SUPERSEDED status badge when opened
 * from a historical Records row.
 */
export function SceneQcReportSheet({ studioId, confirmationId, open, onOpenChange }: SceneQcReportSheetProps) {
  const isMobile = useIsMobile();
  const reportQuery = useSceneQcReportQuery(studioId, confirmationId ?? undefined);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!confirmationId || !reportQuery.data)
      return;
    setIsDownloading(true);
    try {
      const filename = `scene-qc-report-${reportQuery.data.operational_date}-r${reportQuery.data.confirmation_revision}.csv`;
      await downloadSceneQcReportCsv(studioId, confirmationId, filename);
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadButton = (
    <Button type="button" variant="outline" size="sm" disabled={!reportQuery.data || isDownloading} onClick={() => void handleDownload()}>
      <Download className="mr-2 h-4 w-4" />
      {isDownloading ? 'Downloading…' : 'Download CSV'}
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="flex h-[100dvh] max-h-[100dvh] flex-col">
          <DrawerHeader className="border-b text-left">
            <DrawerTitle>Manager Report</DrawerTitle>
            <DrawerDescription className="sr-only">Read-only Scene QC manager report.</DrawerDescription>
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
            <SceneQcReportView report={reportQuery.data} isLoading={reportQuery.isLoading} isError={reportQuery.isError} />
          </div>
          <DrawerFooter className="border-t">{downloadButton}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>Manager Report</SheetTitle>
          <SheetDescription className="sr-only">Read-only Scene QC manager report.</SheetDescription>
        </SheetHeader>
        <SceneQcReportView report={reportQuery.data} isLoading={reportQuery.isLoading} isError={reportQuery.isError} />
        <SheetFooter>{downloadButton}</SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
