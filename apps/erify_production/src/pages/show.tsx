import { useShowDetails } from "@/shows/hooks/use-show-details";
import { LoaderCircle } from "lucide-react";
import { useParams } from "react-router";

export const Show: React.FC = () => {
  const { show_uid } = useParams();
  const { isPending } = useShowDetails(show_uid);

  if (isPending) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <div>
          <LoaderCircle className="animate-spin" />
        </div>
      </div>
    );
  }

  return null;
};

export default Show;
