export const API_ENDPOINTS = {
  AUTH: {
    TOKEN: "/api/auth/token",
    SIGNIN: {
      EMAIL: "/api/auth/sign-in",
    },
    SIGNUP: {
      EMAIL: "/api/auth/sign-up",
    },
    SIGNOUT: "/api/auth/sign-out",
    SESSION: "/api/auth/session",
    MAGIC_LINK: "/api/auth/sign-in/magic-link",
    FORGOT_PASSWORD: "/api/auth/forgot-password",
    RESET_PASSWORD: "/api/auth/reset-password",
    SEND_VERIFICATION: "/api/auth/send-verification",
    VERIFY_EMAIL: "/api/auth/verify-email",
    CHANGE_EMAIL: "/api/auth/change-email",
    CHANGE_PASSWORD: "/api/auth/change-password",
    ORGANIZATION: {
      CREATE: "/api/auth/organization",
      INVITE: "/api/auth/organization/invite",
      ACCEPT_INVITATION: "/api/auth/organization/accept-invitation",
      REJECT_INVITATION: "/api/auth/organization/reject-invitation",
      REMOVE_MEMBER: "/api/auth/organization/remove-member",
      UPDATE_MEMBER_ROLE: "/api/auth/organization/update-member-role",
    },
    TEAM: {
      CREATE: "/api/auth/team",
      ADD_MEMBER: "/api/auth/team/add-member",
      REMOVE_MEMBER: "/api/auth/team/remove-member",
    },
    ADMIN: {
      IMPERSONATE: "/api/auth/admin/impersonate",
      STOP_IMPERSONATING: "/api/auth/admin/stop-impersonating",
      CREATE_USER: "/api/auth/admin/create-user",
      DELETE_USER: "/api/auth/admin/delete-user",
      UPDATE_USER: "/api/auth/admin/update-user",
    },
  },
};
