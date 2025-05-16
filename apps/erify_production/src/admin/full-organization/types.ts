import type { useQueryFullOrganization } from "@/admin/full-organization/hooks/use-query-full-organization";

export type Organization = NonNullable<ReturnType<typeof useQueryFullOrganization>["data"]>;
