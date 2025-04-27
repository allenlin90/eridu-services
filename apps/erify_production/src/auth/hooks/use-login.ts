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
    // TODO: check if user is created in api services

    if (res) {
      navigate("/");
    }
  }, [authLogin, navigate]);

  return {
    error,
    loading,
    login,
    abortFetching,
  };
};
