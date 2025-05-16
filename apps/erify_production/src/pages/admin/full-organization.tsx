import { Content } from "@/admin/full-organization/components/content";
import { Header } from "@/admin/full-organization/components/header";
import { useFullOrganization } from "@/admin/full-organization/hooks/use-full-organization";
import FullPage from "@/components/hoc/full-page";
import { LoaderCircle } from "lucide-react";

const AdminFullOrganization: React.FC = () => {
  const { isPending, isError, data, error } = useFullOrganization();

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
    <div className="p-4 flex flex-col gap-4">
      <Header organization={data} />
      <Content organization={data} />
    </div>
  );
};

export const AdminFullOrganizationFullPage = FullPage(AdminFullOrganization);

export default AdminFullOrganizationFullPage;
