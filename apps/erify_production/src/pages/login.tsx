import { Button } from "@eridu/ui/components/button";
import { LoginForm } from "@eridu/ui/components/login-form";
import { useCallback } from "react";

export const LoginPage: React.FC = () => {
  const onSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  }, []);

  return <div className="h-screen w-full flex justify-center items-center"><LoginForm className="min-w-80" onSubmit={onSubmit} forgetPassword={<Button variant="link" type="button" className="ml-auto pr-0">Forget your password?</Button>} /></div>;
};

export default LoginPage;
