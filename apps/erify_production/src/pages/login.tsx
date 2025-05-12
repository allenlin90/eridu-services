import { useLogin } from "@/auth/hooks/use-login";
import { ROUTES } from "@/constants/routes";
import { Button } from "@eridu/ui/components/button";
import { LoginForm } from "@eridu/ui/components/login-form";
import { Link } from "react-router";

export const LoginPage: React.FC = () => {
  const { error, loading, login } = useLogin();

  // TODO: redirect to auth service for authentication
  return (
    <div className="h-screen w-full flex justify-center items-center">
      <LoginForm
        className="min-w-80"
        disabled={loading}
        error={error}
        onSubmit={login}
        forgetPassword={(
          <Button variant="link" type="button" className="ml-auto pr-0" asChild>
            <Link to={ROUTES.FORGET_PASSWORD}>
              Forget your password?
            </Link>
          </Button>
        )}
      />
    </div>
  );
};

export default LoginPage;
