import { FullPage } from "@/components/hoc/full-page";
import { useParams } from "react-router";

const Studio: React.FC = () => {
  const { studio_uid } = useParams();

  return (
    <>
      Studio
      {" "}
      {studio_uid}
    </>
  );
};

export const StudioPage = FullPage(Studio);

export default StudioPage;
