import { ResetPasswordForm } from "@/auth/components/forms/reset-password-form";
import { useResetPassword } from "@/auth/hooks/use-reset-password";
import { ROUTES } from "@/constants/routes";
import { Card, CardContent, CardHeader, CardTitle } from "@eridu/ui/components/card";
import { useToast } from "@eridu/ui/hooks/use-toast";
import { useCallback, useMemo } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";

type ResetPassword = React.ComponentProps<typeof ResetPasswordForm>["onSubmit"];

export const ResetPasswordPage: React.FC = () => {
  const { mutateAsync, isPending } = useResetPassword();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const token = useMemo(() => searchParams.get("token")!, [searchParams]);

  const onSubmit: ResetPassword
  = useCallback(async ({ password }) => {
    const res = await mutateAsync({ password, token });
    if (res.data?.status) {
      toast({
        variant: "success",
        description: "Password is reset",
      });
      return navigate(ROUTES.LOGIN);
    }

    if (res.error?.code === "INVALID_TOKEN") {
      toast({
        variant: "destructive",
        description: "Token is invalid",
      });
      return navigate(ROUTES.FORGET_PASSWORD);
    }
  }, [mutateAsync, navigate, toast, token]);

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
          <ResetPasswordForm className="min-w-80" disabled={isPending} onSubmit={onSubmit} />
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;
