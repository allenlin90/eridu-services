import type { memberSchema, organizationSchema } from "better-auth/plugins";
import type { JWTPayload } from "jose";
import type { z } from "zod";

export type { User } from "better-auth";

export type Member = z.infer<typeof memberSchema>;
export type Organization = z.infer<typeof organizationSchema>;

export type Session = JWTPayload & User & {
  memberships: (Member & { organization: Organization })[];
};
