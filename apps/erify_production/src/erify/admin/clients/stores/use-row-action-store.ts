import type { Client } from "@/erify/types";

import { create } from "zustand";

type Actions =
  | "remove_client"
  | "update_client"
  | null;

type RowActionState = {
  action: Actions;
  client: Client | null;
  openDialog: (action: Actions, client: Client) => void;
  closeDialog: () => void;
};

export const useRowActionStore = create<RowActionState>(set => ({
  action: null,
  client: null,
  openDialog: (action, client) => set({ action, client }),
  closeDialog: () => set({ action: null, client: null }),
}));
