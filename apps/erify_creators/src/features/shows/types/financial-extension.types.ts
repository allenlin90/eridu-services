/**
 * Forward-compatible creator financial extension types.
 * These contracts intentionally have no UI surface yet.
 */

export type CreatorFinancialScope = {
  showId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type CreatorCompensationSnapshot = {
  showId: string;
  creatorId: string;
  compensationType: string | null;
  agreedRate: string | null;
  commissionRate: string | null;
  effectiveHourlyRate: string | null;
  currency: string;
};

export type CreatorEconomicsSummary = {
  showId: string;
  revenue: string | null;
  laborCost: string | null;
  contributionMargin: string | null;
  currency: string;
};
