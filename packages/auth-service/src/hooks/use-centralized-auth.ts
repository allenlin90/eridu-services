import { useCallback } from "react";

export type CentralizedAuthConfig = {
  authServiceUrl: string;
  clientId?: string;
  redirectUri?: string;
};

export type CentralizedAuthResult = {
  login: () => void;
  signup: () => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  user: any | null;
  loading: boolean;
};

export function useCentralizedAuth(config: CentralizedAuthConfig): CentralizedAuthResult {
  const { authServiceUrl, clientId, redirectUri } = config;

  const login = useCallback(() => {
    const params = new URLSearchParams();
    if (clientId)
      params.set("client_id", clientId);
    if (redirectUri)
      params.set("redirect_uri", redirectUri);

    const loginUrl = `${authServiceUrl}/login?${params.toString()}`;
    window.location.href = loginUrl;
  }, [authServiceUrl, clientId, redirectUri]);

  const signup = useCallback(() => {
    const params = new URLSearchParams();
    if (clientId)
      params.set("client_id", clientId);
    if (redirectUri)
      params.set("redirect_uri", redirectUri);

    const signupUrl = `${authServiceUrl}/signup?${params.toString()}`;
    window.location.href = signupUrl;
  }, [authServiceUrl, clientId, redirectUri]);

  const logout = useCallback(async () => {
    try {
      await fetch(`${authServiceUrl}/api/auth/sign-out`, {
        method: "POST",
        credentials: "include",
      });
    }
    catch (error) {
      console.error("Logout error:", error);
    }

    // Redirect to login page
    window.location.href = `${authServiceUrl}/login`;
  }, [authServiceUrl]);

  // For now, return mock values - in a real implementation, you'd check session status
  return {
    login,
    signup,
    logout,
    isAuthenticated: false, // This would be determined by checking session
    user: null, // This would be fetched from session
    loading: false,
  };
}
