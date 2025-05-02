export type Membership = {
  id: string;
  role: "admin" | "user";
  team: { id: string; name: string } | null;
  organization: {
    id: string;
    logo?: string | null;
    metadata?: Record<string, any> | null;
    name: string;
    slug?: string | null;
  };
};
