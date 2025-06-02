import type { Material } from "@/erify/types";

import { create } from "zustand";

type Actions =
  | "update_material"
  | "remove_material"
  | null;

type RowActionState = {
  action: Actions;
  material: Material | null;
  openDialog: (action: Actions, material: Material) => void;
  closeDialog: () => void;
};

export const useRowActionStore = create<RowActionState>(set => ({
  action: null,
  material: null,
  openDialog: (action, material) => set({ action, material }),
  closeDialog: () => set({ action: null, material: null }),
}));
