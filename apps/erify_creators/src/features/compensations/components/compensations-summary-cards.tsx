import {
  AlertCircle,
  Award,
  CheckCircle2,
  DollarSign,
  Info,
  TrendingUp,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@eridu/ui';

import { formatAmount } from '@/features/compensations/lib/compensations-display';
import * as m from '@/paraglide/messages.js';

export type CompensationsSummaryCardsProps = {
  isLoading: boolean;
  totalAmount: string;
  showsCount: number;
  unresolvedCount: number;
};

export function CompensationsSummaryCards({
  isLoading,
  totalAmount,
  showsCount,
  unresolvedCount,
}: CompensationsSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {m['compensations.summary.totalEarnings']()}
          </CardTitle>
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <DollarSign className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">
            {isLoading ? '...' : formatAmount(totalAmount)}
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {m['compensations.summary.totalEarningsHint']()}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {m['compensations.summary.showsCompleted']()}
          </CardTitle>
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Award className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">
            {isLoading ? '...' : showsCount}
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {m['compensations.summary.showsCompletedHint']()}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {m['compensations.summary.pendingItems']()}
          </CardTitle>
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <AlertCircle className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">
            {isLoading ? '...' : unresolvedCount}
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Info className="h-3 w-3" />
            {m['compensations.summary.pendingItemsHint']()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
