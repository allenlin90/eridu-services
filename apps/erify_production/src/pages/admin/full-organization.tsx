import { Content } from "@/admin/full-organization/components/content";
import { Header } from "@/admin/full-organization/components/header";
import { useQueryFullOrganization } from "@/admin/full-organization/hooks/use-query-full-organization";
import { FullOrganizationProvider } from "@/admin/full-organization/providers/full-organization-provider";
import FullPage from "@/components/hoc/full-page";
import { LoaderCircle } from "lucide-react";

const AdminFullOrganization: React.FC = () => {
  const { isPending, isError, data, error } = useQueryFullOrganization();

  if (isPending) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <div>
          <LoaderCircle className="animate-spin" />
        </div>
      </div>
    );
  }

  if (isError) {
    return <p className="text-center">{error?.message || "something went wrong"}</p>;
  }

  if (!data) {
    return <p className="text-center">No data</p>;
  }

  return (
    <FullOrganizationProvider organization={data}>
      <div className="p-4 flex flex-col gap-4">
        <Header />
        <Content />
      </div>
    </FullOrganizationProvider>
  );
};

export const AdminFullOrganizationFullPage = FullPage(AdminFullOrganization);

export default AdminFullOrganizationFullPage;
