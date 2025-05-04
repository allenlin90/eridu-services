import { Button } from "@eridu/ui/components/button";
import { Link } from "react-router";

export const NotFound: React.FC = () => {
  return (
    <div className="flex-1 flex w-full flex-col items-center justify-center text-center">
      <h1 className="text-4xl font-bold text-primary">404</h1>
      <p className="mt-2 text-lg text-muted-foreground">
        Oops! The page you are looking for does not exist.
      </p>
      <Button asChild variant="default" className="mt-4">
        <Link to="/">Go Back Home</Link>
      </Button>
    </div>
  );
};

export default NotFound;
