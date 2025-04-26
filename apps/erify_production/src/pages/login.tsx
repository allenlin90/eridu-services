import { useLogin } from "@eridu/auth-service/hooks/use-login";
import { Button } from "@eridu/ui/components/button";
import { LoginForm } from "@eridu/ui/components/login-form";
import { useCallback } from "react";
import { useNavigate } from "react-router";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, loading } = useLogin();

  const onSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const credentials = Object.fromEntries(formData.entries()) as {
      email: string;
      password: string;
    };

    const res = await login(credentials);

    if (res) {
      navigate("/");
    }
  }, [login, navigate]);

  return (
    <div className="h-screen w-full flex justify-center items-center">
      <LoginForm
        className="min-w-80"
        disabled={loading}
        onSubmit={onSubmit}
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
