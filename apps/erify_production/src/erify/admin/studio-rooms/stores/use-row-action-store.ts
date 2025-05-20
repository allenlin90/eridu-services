import type { StudioRoom } from "@/erify/types";

import { create } from "zustand";

type Actions =
  | "update_studio_room"
  | "remove_studio_room"
  | null;

type RowActionState = {
  action: Actions;
  studioRoom: StudioRoom | null;
  openDialog: (action: Actions, studioRoom: StudioRoom) => void;
  closeDialog: () => void;
};

export const useRowActionStore = create<RowActionState>(set => ({
  action: null,
  studioRoom: null,
  openDialog: (action, studioRoom) => set({ action, studioRoom }),
  closeDialog: () => set({ action: null, studioRoom: null }),
}));
