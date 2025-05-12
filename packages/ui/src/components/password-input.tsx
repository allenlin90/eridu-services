import { Eye, EyeClosed } from "lucide-react";
import { useCallback, useState } from "react";

import { cn } from "../lib/utils";
import { Button } from "./button";
import { Input } from "./input";

type PasswordInputProps = {} & React.ComponentProps<"input">;

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [showText, setShowText] = useState(false);

  const onClick: React.MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    setShowText(prev => !prev);
  }, []);

  return (
    <div className="relative w-full">
      <Input
        className={cn(className, "w-full pr-9")}
        type={showText ? "text" : "password"}
        {...props}
      />
      <Button
        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        type="button"
        variant="ghost"
        size="icon"
        onClick={onClick}
      >
        {showText ? <EyeClosed /> : <Eye />}
        <span className="sr-only">Clear</span>
      </Button>
    </div>
  );
}

export default PasswordInput;
