import { ShowDetailsCard } from "@/livestream/show-details/show-details-card";
import { useMaterials } from "@/livestream/shows/hooks/use-materials";
import { useShowDetails } from "@/livestream/shows/hooks/use-show-details";
import { LoaderCircle } from "lucide-react";
import { useParams } from "react-router";

export const Show: React.FC = () => {
  const { show_uid } = useParams();
  const { isPending: isLoadingShowDetails, data: showDetails } = useShowDetails(show_uid);
  const { isPending: isLoadingMaterials, data: showMaterials } = useMaterials(show_uid);

  if (!showDetails) {
    // TODO: implement not found
    return null;
  }

  if (isLoadingShowDetails || isLoadingMaterials) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <div>
          <LoaderCircle className="animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <ShowDetailsCard showDetails={showDetails} showMaterials={showMaterials} />
    </div>
  );
};

export default Show;
