import type { MC } from "@/erify/types";

import { create } from "zustand";

type Actions =
  | "remove_mc"
  | "update_mc"
  | null;

type RowActionState = {
  action: Actions;
  mc: MC | null;
  openDialog: (action: Actions, mc: MC) => void;
  closeDialog: () => void;
};

export const useRowActionStore = create<RowActionState>(set => ({
  action: null,
  mc: null,
  openDialog: (action, mc) => set({ action, mc }),
  closeDialog: () => set({ action: null, mc: null }),
}));
