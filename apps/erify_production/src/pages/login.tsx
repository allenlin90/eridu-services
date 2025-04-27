import { useLogin } from "@/auth/hooks/use-login";
import { Button } from "@eridu/ui/components/button";
import { LoginForm } from "@eridu/ui/components/login-form";

export const LoginPage: React.FC = () => {
  const { error, loading, login } = useLogin();

  return (
    <div className="h-screen w-full flex justify-center items-center">
      <LoginForm
        className="min-w-80"
        disabled={loading}
        error={error}
        onSubmit={login}
        forgetPassword={(
          <Button variant="link" type="button" className="ml-auto pr-0">
            Forget your password?
          </Button>
        )}
      />
    </div>
  );
};

export default LoginPage;
