import type { User } from "@/erify/types";

import { create } from "zustand";

type Actions =
  | "update_user"
  | "remove_user"
  | null;

type RowActionState = {
  action: Actions;
  user: User | null;
  openDialog: (action: Actions, user: User) => void;
  closeDialog: () => void;
};

export const useRowActionStore = create<RowActionState>(set => ({
  action: null,
  user: null,
  openDialog: (action, user) => set({ action, user }),
  closeDialog: () => set({ action: null, user: null }),
}));
