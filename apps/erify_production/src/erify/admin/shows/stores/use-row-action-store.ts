import type { Show } from "@/erify/types";

import { create } from "zustand";

type Actions =
  | "update_show"
  | "remove_show"
  | null;

type RowActionState = {
  action: Actions;
  show: Show | null;
  openDialog: (action: Actions, show: Show) => void;
  closeDialog: () => void;
};

export const useRowActionStore = create<RowActionState>(set => ({
  action: null,
  show: null,
  openDialog: (action, show) => set({ action, show }),
  closeDialog: () => set({ action: null, show: null }),
}));
