import type { invitationSchema, memberSchema, organizationSchema, teamSchema } from "better-auth/plugins";
import type { JWTPayload } from "jose";
import type { z } from "zod";

import type { AuthClient } from "@eridu/auth-service/contexts/auth-context";

export type { AuthClient } from "@eridu/auth-service/contexts/auth-context";

export type { UserWithRole } from "better-auth/plugins";
export type User = AuthClient["$Infer"]["Session"]["user"];
export type Member = z.infer<typeof memberSchema>;
export type Organization = z.infer<typeof organizationSchema>;
export type Team = z.infer<typeof teamSchema>;
export type Membership = (Member & { organization: Organization; team: Team });
export type Invitation = z.infer<typeof invitationSchema>;
export type InvitationWithOrganization = Invitation & { organizationName: string; inviterEmail: string };
export type Role = "admin" | "user" | "owner" | "member";
export type Session = JWTPayload & User & {
  role: Role;
  activeOrganizationId: string | null;
  activeTeamId: string | null;
  impersonatedBy: string | null;
  memberships: Membership[];
};
