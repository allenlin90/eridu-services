import twConfig from "@eridu/ui/tailwind.config";
import merge from "deepmerge";

export default merge(twConfig, {
  theme: {
    extend: {
      maxHeight: {
        "show-content-area": "calc(100vh - 8.25rem)", // Add custom max-height
      },
    },
  },
});
