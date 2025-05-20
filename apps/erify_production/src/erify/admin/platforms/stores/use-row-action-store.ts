import type { Platform } from "@/erify/types";

import { create } from "zustand";

type Actions =
  | "remove_platform"
  | "update_platform"
  | null;

type RowActionState = {
  action: Actions;
  platform: Platform | null;
  openDialog: (action: Actions, platform: Platform) => void;
  closeDialog: () => void;
};

export const useRowActionStore = create<RowActionState>(set => ({
  action: null,
  platform: null,
  openDialog: (action, platform) => set({ action, platform }),
  closeDialog: () => set({ action: null, platform: null }),
}));
