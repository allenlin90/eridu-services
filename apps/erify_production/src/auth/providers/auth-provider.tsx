import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router";

import AuthContext from "../contexts/auth-context";
import { useToken } from "../hooks/use-token";

export const AuthProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const navigate = useNavigate();
  const { error, loading, session, token, refetch } = useToken();
  const value = useMemo(() => ({ token, session, loading, error, refetch }), [loading, error, token, session, refetch]);

  useEffect(() => {
    if (error) {
      navigate("/login");
    }
  }, [error, navigate]);

  return (
    <AuthContext value={value}>
      {children}
    </AuthContext>
  );
};
