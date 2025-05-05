import { ROUTES } from "@/constants/routes";
import { useLogin as useAuthServiceLogin } from "@eridu/auth-service/hooks/use-login";
import { useCallback } from "react";
import { useNavigate } from "react-router";

export const useLogin = () => {
  const navigate = useNavigate();
  const { loading, error, login: authLogin, abortFetching } = useAuthServiceLogin();

  const login = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const credentials = Object.fromEntries(formData.entries()) as {
      email: string;
      password: string;
    };

    const res = await authLogin(credentials);

    if (res) {
      navigate(ROUTES.DASHBOARD);
    }
  }, [authLogin, navigate]);

  return {
    error,
    loading,
    login,
    abortFetching,
  };
};
