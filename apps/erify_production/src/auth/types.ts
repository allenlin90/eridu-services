export type Membership = {
  id: string;
  role: Role;
  team: { id: string; name: Team } | null;
  organization: {
    id: string;
    logo?: string | null;
    metadata?: Record<string, any> | null;
    name: Organization;
    slug?: string | null;
  };
};

export type Role = "admin" | "user";

export enum Organization {
  Erify = "erify",
  Erisa = "erisa",
  Commerce = "commerce",
}

export enum Team {
  Onset = "erify-onset",
  Offset = "erify-offset",
  ErisaTeam = "erisa-team",
  CommerceTeam = "commerce-team",
}

// Map teams to organizations
export const OrganizationTeams: Record<Organization, Team[]> = {
  [Organization.Erify]: [Team.Onset, Team.Offset],
  [Organization.Erisa]: [Team.ErisaTeam],
  [Organization.Commerce]: [Team.CommerceTeam],
};
