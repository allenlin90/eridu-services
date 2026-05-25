import { AlertTriangle, Calendar, Info, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

import type { StudioCreatorCompensationShow } from '@eridu/api-types/studio-creators';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@eridu/ui';

import { CompensationsBreakdownTable } from '@/features/compensations/components/compensations-breakdown-table';

export type CompensationsDataPanelProps = {
  isLoading: boolean;
  isError: boolean;
  isQueryEnabled: boolean;
  dateFrom?: string;
  dateTo?: string;
  shows: StudioCreatorCompensationShow[];
  onRetry: () => void;
};

function PanelMessage({
  icon,
  message,
  action,
}: {
  icon: ReactNode;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-sm text-slate-400 gap-2">
      {icon}
      <p>{message}</p>
      {action ?? null}
    </div>
  );
}

export function CompensationsDataPanel({
  isLoading,
  isError,
  isQueryEnabled,
  dateFrom,
  dateTo,
  shows,
  onRetry,
}: CompensationsDataPanelProps) {
  let body: ReactNode = null;

  if (isLoading && isQueryEnabled) {
    body = (
      <div className="flex flex-col items-center justify-center p-12 text-sm text-slate-400 gap-3">
        <RefreshCw className="h-6 w-6 text-indigo-400 animate-spin" />
        <span>Loading compensations data...</span>
      </div>
    );
  } else if (!isLoading && isError && isQueryEnabled) {
    body = (
      <div className="flex flex-col items-center justify-center p-12 text-sm text-red-400 gap-4">
        <AlertTriangle className="h-8 w-8" />
        <p>Failed to load compensations data. Please try again.</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      </div>
    );
  } else if (!isQueryEnabled) {
    const message = dateFrom && !dateTo
      ? 'Please select an end date to view compensations.'
      : 'No compensations found for the selected period.';
    const icon = dateFrom && !dateTo
      ? <Calendar className="h-8 w-8 text-indigo-400/80 animate-pulse" />
      : <Info className="h-8 w-8 text-slate-500" />;
    body = <PanelMessage icon={icon} message={message} />;
  } else if (!isLoading && !isError && shows.length === 0) {
    body = (
      <PanelMessage
        icon={<Info className="h-8 w-8 text-slate-500" />}
        message="No compensations found for the selected period."
      />
    );
  } else if (!isLoading && !isError && shows.length > 0) {
    body = <CompensationsBreakdownTable shows={shows} />;
  }

  return (
    <Card className="bg-slate-900/20 border-slate-800 shadow-xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-800/80 bg-slate-900/35">
        <CardTitle className="text-base text-slate-200">Show Compensation Breakdown</CardTitle>
        <CardDescription className="text-xs text-slate-400">
          Detailed listing of agreed contract rates, commissions, adjustments, and final payments.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {body}
      </CardContent>
    </Card>
  );
}
