import type { StudioCreatorRosterState } from '@eridu/api-types/studio-creators';

export type StudioCreatorCatalogItemPayload = {
  uid: string;
  name: string;
  aliasName: string;
  isRostered: boolean;
  rosterState: StudioCreatorRosterState;
};

export type CreateStudioCreatorRosterPayload = {
  creatorId: string;
  defaultRate?: number | null;
  defaultRateType?: string | null;
  defaultCommissionRate?: number | null;
  metadata?: object;
};

export type UpdateStudioCreatorRosterPayload = {
  version: number;
  defaultRate?: number | null;
  defaultRateType?: string | null;
  defaultCommissionRate?: number | null;
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
    defaultRate?: number | null;
    defaultRateType?: string | null;
    defaultCommissionRate?: number | null;
    metadata?: object;
  };
};
