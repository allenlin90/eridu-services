import type { UserWithRole } from "@eridu/auth-service/types";

import { create } from "zustand";

type Actions =
  | "ban_user"
  | "unban_user"
  | "remove_user"
  | "revoke_user_sessions"
  | "reset_user_password"
  | "set_user_role"
  | "send_verification_email"
  | "impersonate_user"
  | "stop_impersonating_user"
  | null;

type RowActionState = {
  action: Actions;
  user: UserWithRole | null;
  openDialog: (action: Actions, user: UserWithRole) => void;
  closeDialog: () => void;
};

export const useRowActionStore = create<RowActionState>(set => ({
  action: null,
  user: null,
  openDialog: (action, user) => set({ action, user }),
  closeDialog: () => set({ action: null, user: null }),
}));
