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
import * as m from '@/paraglide/messages.js';

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
    <div className="flex flex-col items-center justify-center gap-2 p-16 text-sm text-muted-foreground">
      {icon}
      <p>{message}</p>
      {action ?? null}
    </div>
  );
}

function selectBody({
  isLoading,
  isError,
  isQueryEnabled,
  dateFrom,
  dateTo,
  shows,
  onRetry,
}: CompensationsDataPanelProps): ReactNode {
  if (isLoading && isQueryEnabled) {
    return (
      <PanelMessage
        icon={<RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />}
        message={m['compensations.panel.loading']()}
      />
    );
  }

  if (isError && isQueryEnabled) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12 text-sm text-destructive">
        <AlertTriangle className="h-8 w-8" />
        <p>{m['compensations.panel.error']()}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {m['compensations.panel.retry']()}
        </Button>
      </div>
    );
  }

  if (!isQueryEnabled) {
    const awaitingEndDate = Boolean(dateFrom) && !dateTo;
    return (
      <PanelMessage
        icon={awaitingEndDate
          ? <Calendar className="h-8 w-8 text-muted-foreground" />
          : <Info className="h-8 w-8 text-muted-foreground" />}
        message={awaitingEndDate
          ? m['compensations.panel.selectEndDate']()
          : m['compensations.panel.empty']()}
      />
    );
  }

  if (shows.length === 0) {
    return (
      <PanelMessage
        icon={<Info className="h-8 w-8 text-muted-foreground" />}
        message={m['compensations.panel.empty']()}
      />
    );
  }

  return <CompensationsBreakdownTable shows={shows} />;
}

export function CompensationsDataPanel(props: CompensationsDataPanelProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b">
        <CardTitle className="text-base">{m['compensations.panel.title']()}</CardTitle>
        <CardDescription>{m['compensations.panel.description']()}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {selectBody(props)}
      </CardContent>
    </Card>
  );
}
