import type { Brand } from "@/erify/types";

import { create } from "zustand";

type Actions =
  | "remove_brand"
  | null;

type RowActionState = {
  action: Actions;
  brand: Brand | null;
  openDialog: (action: Actions, brand: Brand) => void;
  closeDialog: () => void;
};

export const useRowActionStore = create<RowActionState>(set => ({
  action: null,
  brand: null,
  openDialog: (action, brand) => set({ action, brand }),
  closeDialog: () => set({ action: null, brand: null }),
}));
