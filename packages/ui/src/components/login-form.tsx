import { Button } from "@eridu/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@eridu/ui/components/card";
import { Input } from "@eridu/ui/components/input";
import { Label } from "@eridu/ui/components/label";
import { cn } from "@eridu/ui/lib/utils";

type LoginFormProps = {
  allowSignup?: boolean;
  allowSocialLogin?: boolean;
  description?: React.ReactNode;
  disabled?: boolean;
  forgetPassword?: React.ReactNode;
  formProps?: React.ComponentPropsWithoutRef<"form">;
  header?: React.ReactNode;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
};

export function LoginForm({
  allowSignup = false,
  allowSocialLogin = false,
  className,
  description,
  disabled = false,
  forgetPassword,
  formProps,
  header = "Login",
  onSubmit,
  ...props

}: Omit<React.ComponentPropsWithoutRef<"div">, "onSubmit"> & LoginFormProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{header}</CardTitle>
          {description && (
            <CardDescription>
              {description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form {...formProps} aria-disabled={disabled} onSubmit={onSubmit}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="email"
                  disabled={disabled}
                  required
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  {forgetPassword}
                </div>
                <Input id="password" name="password" type="password" disabled={disabled} required />
              </div>
              <Button type="submit" disabled={disabled} className="w-full">
                Login
              </Button>
              {allowSocialLogin && (
                <Button disabled={disabled} variant="outline" className="w-full">
                  Login with Google
                </Button>
              )}
            </div>
            {allowSignup && (
              <div className="mt-4 text-center text-sm">
                Don&apos;t have an account?
                {" "}
                <a href="#" className="underline underline-offset-4">
                  Sign up
                </a>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
