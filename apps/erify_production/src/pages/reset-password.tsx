import { ResetPasswordForm } from "@/auth/components/forms/reset-password-form";
import { ROUTES } from "@/constants/routes";
import useSession from "@eridu/auth-service/hooks/use-session";
import { Card, CardContent, CardHeader, CardTitle } from "@eridu/ui/components/card";
import { useToast } from "@eridu/ui/hooks/use-toast";
import { useCallback, useMemo } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";

type ResetPassword = React.ComponentProps<typeof ResetPasswordForm>["onSubmit"];

export const ResetPasswordPage: React.FC = () => {
  const { authClient } = useSession();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const token = useMemo(() => searchParams.get("token")!, [searchParams]);

  const onSubmit: ResetPassword
  = useCallback(async ({ password }) => {
    const res = await authClient.resetPassword({ newPassword: password, token });
    if (res.data?.status) {
      return navigate(ROUTES.LOGIN);
    }

    if (res.error?.code === "INVALID_TOKEN") {
      toast({
        variant: "destructive",
        description: "Token is invalid",
      });
      return navigate(ROUTES.FORGET_PASSWORD);
    }
  }, [authClient, navigate, toast, token]);

  if (!token) {
    return <Navigate to={ROUTES.LOGIN} />;
  }

  return (
    <div className="h-screen w-full flex justify-center items-center">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm className="min-w-80" onSubmit={onSubmit} />
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;
