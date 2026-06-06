import type { StudioCreatorRosterState } from '@eridu/api-types/studio-creators';

export type StudioCreatorCatalogItemPayload = {
  uid: string;
  name: string;
  aliasName: string;
  isRostered: boolean;
  rosterState: StudioCreatorRosterState;
  defaultRate: string | null;
  defaultRateType: string | null;
  defaultCommissionRate: string | null;
};

export type CreateStudioCreatorRosterPayload = {
  creatorId: string;
  defaultRate?: string | null;
  defaultRateType?: string | null;
  defaultCommissionRate?: string | null;
  metadata?: object;
};

export type UpdateStudioCreatorRosterPayload = {
  version: number;
  defaultRate?: string | null;
  defaultRateType?: string | null;
  defaultCommissionRate?: string | null;
  isActive?: boolean;
  metadata?: object;
};

export type OnboardCreatorPayload = {
  creator: {
    name: string;
    aliasName: string;
    userId?: string | null;
    metadata?: object;
  };
  roster: {
    defaultRate?: string | null;
    defaultRateType?: string | null;
    defaultCommissionRate?: string | null;
    metadata?: object;
  };
};
