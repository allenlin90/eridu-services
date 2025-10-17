import twConfig from "@eridu/ui/tailwind.config";
import merge from "deepmerge";

export default merge(twConfig, {
  content: [
    "./src/frontend/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/components/**/*.{ts,tsx}",
  ],
});
