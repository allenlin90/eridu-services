import type { Studio } from "@/erify/types";

import { create } from "zustand";

type Actions =
  | "remove_studio"
  | "update_studio"
  | null;

type RowActionState = {
  action: Actions;
  studio: Studio | null;
  openDialog: (action: Actions, studio: Studio) => void;
  closeDialog: () => void;
};

export const useRowActionStore = create<RowActionState>(set => ({
  action: null,
  studio: null,
  openDialog: (action, studio) => set({ action, studio }),
  closeDialog: () => set({ action: null, studio: null }),
}));
