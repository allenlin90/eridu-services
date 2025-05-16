import type { useFullOrganization } from "@/admin/full-organization/hooks/use-full-organization";

export type Organization = NonNullable<ReturnType<typeof useFullOrganization>["data"]>;
