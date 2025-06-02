import twConfig from "@eridu/ui/tailwind.config";
import merge from "deepmerge";

export default merge(twConfig, {
  theme: {
    extend: {
      maxHeight: {
        "sm-user-content-area": "calc(100vh - 16.25rem)",
        "user-content-area": "calc(100vh - 12.5rem)",
        "show-content-area": "calc(100vh - 11.5rem)",
      },
    },
  },
});
