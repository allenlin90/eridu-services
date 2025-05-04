import { Button } from "@eridu/ui/components/button";
import { Ban } from "lucide-react";
import { Link } from "react-router";

export const Unauthorized: React.FC = () => {
  return (
    <div className="flex-1 flex justify-center items-center">
      <div className="text-center">
        <div className="flex justify-center">
          <Ban size={64} color="red" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="mb-6 text-gray-600">
          You do not have permission to view this page.
        </p>
        <Button variant="default">
          <Link to="/">
            Go Back
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default Unauthorized;
