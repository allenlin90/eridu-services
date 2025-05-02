import type { AppSidebar } from "@eridu/ui/components/app-sidebar";

type Projects = React.ComponentProps<typeof AppSidebar>["projects"];

export const useProjects = (): Projects => {
  return [];
};
