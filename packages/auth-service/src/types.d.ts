import type { memberSchema, organizationSchema, teamSchema } from "better-auth/plugins";
import type { JWTPayload } from "jose";
import type { z } from "zod";

export type { User } from "better-auth";

export type Member = z.infer<typeof memberSchema>;
export type Organization = z.infer<typeof organizationSchema>;
export type Team = z.infer<typeof teamSchema>;
export type Membership = (Member & { organization: Organization; team: Team });

export type Session = JWTPayload & User & {
  memberships: Membership[];
};
