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
      <Card className="relative overflow-hidden bg-slate-900/30 border-slate-800 hover:border-slate-700/60 transition-all duration-300 shadow-xl group">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors duration-300 pointer-events-none" />
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-slate-400">
            Total Earnings
          </CardTitle>
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <DollarSign className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight text-slate-100">
            {isLoading ? '...' : `$${totalAmount}`}
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-emerald-400" />
            Cumulative show payments
          </p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden bg-slate-900/30 border-slate-800 hover:border-slate-700/60 transition-all duration-300 shadow-xl group">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors duration-300 pointer-events-none" />
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-slate-400">
            Shows Completed
          </CardTitle>
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Award className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight text-slate-100">
            {isLoading ? '...' : showsCount}
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            Assigned shows in range
          </p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden bg-slate-900/30 border-slate-800 hover:border-slate-700/60 transition-all duration-300 shadow-xl group">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors duration-300 pointer-events-none" />
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-slate-400">
            Pending Items
          </CardTitle>
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <AlertCircle className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight text-slate-100">
            {isLoading ? '...' : unresolvedCount}
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <Info className="h-3 w-3 text-amber-400" />
            Awaiting verification
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
