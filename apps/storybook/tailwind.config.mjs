import twConfig from "@eridu/ui/tailwind.config";
import merge from "deepmerge";

export default merge(twConfig, {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./.storybook/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
});
