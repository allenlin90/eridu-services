import { ForgetPasswordForm } from "@/auth/components/forms/forget-password-form";
import { useForgetPassword } from "@/auth/hooks/use-forget-password";
import { ROUTES } from "@/constants/routes";
import { Card, CardContent, CardHeader, CardTitle } from "@eridu/ui/components/card";
import { useToast } from "@eridu/ui/hooks/use-toast";
import throttle from "lodash.throttle";
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router";

const THROTTLE_PERIOD = 3000;

type OnSubmit = React.ComponentProps<typeof ForgetPasswordForm>["onSubmit"];

export const ForgetPasswordPage: React.FC = () => {
  const { mutateAsync, isPending } = useForgetPassword();
  const { toast } = useToast();
  const navigate = useNavigate();

  const sendRequest = useMemo(() =>
    throttle(mutateAsync, THROTTLE_PERIOD, { leading: true, trailing: false }), [mutateAsync]);

  const onSubmit: OnSubmit
   = useCallback(async ({ email }) => {
     const res = await sendRequest({ email });

     if (res) {
       toast({
         variant: "success",
         description: "Email is sent",
       });

       return navigate(ROUTES.LOGIN);
     }
   }, [sendRequest, navigate, toast]);

  return (
    <div className="h-screen w-full flex justify-center items-center">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Forget Password</CardTitle>
        </CardHeader>
        <CardContent>
          <ForgetPasswordForm className="min-w-80" onSubmit={onSubmit} disabled={isPending} />
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgetPasswordPage;
